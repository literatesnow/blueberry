'use strict';

function Blueberry() {
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
          sizeBytes: { string: 'd.size_bytes=' },
          chunksHashed: { string: 'd.chunks_hashed=' },
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
            var percent = (param.completedBytes.i8 / param.sizeBytes.i8) * 100;
            var status;

            if (!param.isActive.i8) {
              status = "Inactive";
            } else if (param.complete.i8) {
              status = "Complete";
            } else if (param.hashing.i8) {
              status = "Hashing";
              percent = (param.chunksHashed.i8 / param.sizeChunks.i8) * 100;
            }

            return {
              hash: param.hash.string,
              name: param.name.string,
              percent: percent,
              status: status,
              remain: param.sizeBytes.i8 - param.completedBytes.i8,
            };
          });
        })
};

Blueberry.prototype.jxhr = function(uri, data) {
  return new Promise(function(resolve, reject) {
    var request = new XMLHttpRequest();
    request.open(data === null ? 'GET' : 'POST', uri);
    request.setRequestHeader('Content-Type', 'application/json; charset=UTF-8');

    request.onreadystatechange = function() {
      if (this.readyState === 4) {
        if (this.status >= 200 && this.status < 400) {
          try {
            //TODO Handle faults
            resolve(JSON.parse(this.responseText));
          } catch (e) {
            reject('Invalid JSON: ' + this.responseText);
          }
        } else {
          reject(this.responseText);
        }
      }
    };

    if (data) {
      request.send(JSON.stringify(data));
    } else {
      request.send();
    }
  });
}
