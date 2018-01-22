'use strict';

function Blueberry() {
  this.vue = null;

  this.refreshInterval = 2000;
  this.timer = null;
  this.isUpdating = false;
}

Blueberry.rpc = {
  list: new RPC('d.multicall', [ { string: 'main' } ], {
          //torrent
          hash: { string: 'd.hash=' },
          name: { string: 'd.name=' },
          //Status
          isActive: { string: 'd.is_active=' },
          complete: { string: 'd.complete=' },
          connectionCurrent: { string: 'd.connection_current=' },
          hashing: { string: 'd.hashing=' },
          //Progress
          bytesDone: { string: 'd.bytes_done=' },
          completedBytes: { string: 'd.completed_bytes=' },
          completedChunks: { string: 'd.completed_chunks=' },
          chunkSize: { string: 'd.chunk_size=' },
          chunksHashed: { string: 'd.chunks_hashed=' },
          sizeBytes: { string: 'd.size_bytes=' },
          sizeChunks: { string: 'd.size_chunks=' },
          ratio: { string: 'd.ratio=' },
          //Rate
          upRate: { string: 'd.up.rate=' },
          downRate: { string: 'd.down.rate=' }
        },
        function (params) {
          if (!params) {
            return [];
          }

          return _.map(params, function(param) {
            var percent, status, rate, size;
            var totalUp, totalDown, ratio;

            if (param.upRate.i8 > 0 || param.downRate.i8 > 0) {
              rate = Blueberry.humanFileSize(param.upRate.i8) + ' / ' +
                     Blueberry.humanFileSize(param.downRate.i8);
            } else {
              rate = '';
            }

            size = Blueberry.humanFileSize(param.sizeBytes.i8);

            if (param.hashing.i8) {
              status = 'Hashing';
              percent = (param.chunksHashed.i8 / param.sizeChunks.i8) * 100;

            } else {
              percent = (param.completedBytes.i8 / param.sizeBytes.i8) * 100;

              if (!param.isActive.i8) {
                status = 'Inactive';
              } else if (param.complete.i8) {
                status = 'Complete';
              } else {
                status = 'Downloading';
                size = Blueberry.humanFileSize(param.completedBytes.i8) + ' / ' + size;
                rate += ' (' + moment.duration(((param.sizeBytes.i8 - param.bytesDone.i8) / param.downRate.i8) * 1000).humanize() + ')';
              }
            }

            totalUp = Blueberry.humanFileSize(param.completedChunks.i8 * param.chunkSize.i8 * (param.ratio.i8 / 1000));
            totalDown = Blueberry.humanFileSize(param.completedBytes.i8);
            //remain = param.sizeBytes.i8 - param.completedBytes.i8;
            ratio = (param.ratio.i8 / 1000).toFixed(2);
            percent = percent.toFixed(0) + '%';

            return {
              hash: param.hash.string,
              name: param.name.string,
              size: size,
              percent: percent,
              status: status,
              downloaded: totalDown,
              uploaded: totalUp,
              ratio: ratio,
              rate: rate
            };
          });
        })
};

Blueberry.prototype.bootstrap = function(elem) {
  var self = this;

  this.vue = new Vue({
    el: elem,
    data: {
      torrents: [],
      status: 'Connecting...',
      lastUpdated: new Date()
    },
    methods: {
      lastStatus: function() {
        if (this.status !== null) {
          return this.status;
        }
        return 'Last Updated: ' + moment(this.lastUpdated).format('YYYY-MM-DD HH:mm:ss')
      }
    },
    ready: function() {
      self.refresh();
      self.startTimer();
    }
  });
};

Blueberry.prototype.startTimer = function() {
  var self = this;

  if (!this.timer) {
    this.timer = window.setInterval(function() {
      self.refresh();
    }, this.refreshInterval);
  }
}

Blueberry.prototype.stopTimer = function() {
  if (this.timer) {
    window.clearInterval(this.timer);
  }
};

Blueberry.prototype.refresh = function() {
  if (this.isUpdating) {
    return;
  }

  this.isUpdating = true;
  var self = this;

  this.jxhr('/rtorrent/request', Blueberry.rpc.list.getRequest())
    .then(function(data) {
      self.vue.torrents = Blueberry.rpc.list.getResponse(data);
      self.vue.lastUpdated = new Date();
      self.vue.status = null;
      self.isUpdating = false;
    }, function(err) {
      self.vue.status = 'Error: ' + err;
      self.isUpdating = false;
    });
};

Blueberry.prototype.jxhr = function(uri, data) {
  var self = this;

  return new Promise(function(resolve, reject) {
    var request = new XMLHttpRequest();
    request.open(data === null ? 'GET' : 'POST', uri);
    request.setRequestHeader('Content-Type', 'application/json; charset=UTF-8');

    request.onreadystatechange = function() {
      if (this.readyState === 4) {
        if (this.status >= 200 && this.status < 400) {
          try {
            resolve(JSON.parse(this.responseText));
          } catch (e) {
            reject('Invalid JSON: ' + this.responseText);
          }
        } else {
          reject(this.responseText);
        }
      }
    };

    request.onerror = function(a,b,c,d,e,f) {
      self.vue.status = 'Lost connection blueberry';
    };

    if (data) {
      request.send(JSON.stringify(data));
    } else {
      request.send();
    }
  });
};

//http://stackoverflow.com/questions/10420352/converting-file-size-in-bytes-to-human-readable
Blueberry.humanFileSize = function(bytes, si) {
  var thresh = si ? 1000 : 1024;
  if (Math.abs(bytes) < thresh) {
      return bytes + ' B';
  }

  var u = -1;
  var units = si
      ? ['kB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB']
      : ['KiB', 'MiB', 'GiB', 'TiB', 'PiB', 'EiB', 'ZiB', 'YiB'];

  do {
      bytes /= thresh;
      ++u;
  } while (Math.abs(bytes) >= thresh && u < units.length - 1);

  return bytes.toFixed(1) + ' ' + units[u];
};

//Ported from rtorrent/src/display/utils.cc
//char *print_ddhhmm(char* first, char* last, time_t t)
Blueberry.formatTimeLeft = function(t) {
  if (t / (24 * 3600) >= 100) {
    return '--d --:--';
  }

  var dd = t / (24 * 3600);
  var hh = t / 3600 % 24;
  var mm = t / 60 % 60;

  return dd + 'd ' + hh + ':' + mm;
}
