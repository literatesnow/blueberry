package main

import (
	"bitbucket.org/unrulyknight/scgi"
	"bitbucket.org/unrulyknight/xmlrpc"

	"github.com/julienschmidt/httprouter"

	"encoding/json"
	"errors"
	"log"
	"net/http"
	"os"
)

type rtorrent struct {
	scgi        *scgi.Client
	rtNetwork   string
	rtAddress   string
	httpAddress string
}

var rt rtorrent

func main() {
	rt = rtorrent{}

	if err := readConfig(); err != nil {
		log.Fatalf("Fatal error: %s\n", err)
		return
	}

	log.Printf("rtorrent: %s@%s, http: %s\n",
		rt.rtNetwork,
		rt.rtAddress,
		rt.httpAddress)

	rt.scgi = scgi.NewClient(rt.rtNetwork, rt.rtAddress)

	router := httprouter.New()
	router.POST("/rtorrent/request", rtRequest)
	router.ServeFiles("/public/*filepath", http.Dir("./www/public"))

	log.Fatal(http.ListenAndServe(rt.httpAddress, router))
}

func rtRequest(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
	methodName, params, err := xmlrpc.ParseJsonRequest(r.Body)
	if err != nil {
		fatalErrorResponse(w, 0, err)
		return
	}

	doc := xmlrpc.CreateRequest(methodName, params)
	response, err := rt.scgi.Request(doc)

	if err != nil {
		fatalErrorResponse(w, http.StatusBadGateway, err)
		return
	}

	value, err := xmlrpc.ParseResponse(response)
	if err != nil {
		fatalErrorResponse(w, 0, err)
	}
	buf, err := json.Marshal(value)
	if err != nil {
		fatalErrorResponse(w, 0, err)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.Write(buf)
}

func fatalErrorResponse(w http.ResponseWriter, code int, err error) {
	w.Header().Set("Content-Type", "text/plain")

	if code == 0 {
		code = http.StatusInternalServerError
	}

	w.WriteHeader(code)

	if err != nil {
		log.Printf("Error: %s\n", err.Error())
		w.Write([]byte(err.Error()))
	}
}

func readConfig() (err error) {
	var str string

	str = os.Getenv("RTORRENT_NETWORK")
	if str == "" {
		return errors.New("Missing value for RTORRENT_NETWORK")
	}
	rt.rtNetwork = str

	str = os.Getenv("RTORRENT_ADDRESS")
	if str == "" {
		return errors.New("Missing value for RTORRENT_ADDRESS")
	}
	rt.rtAddress = str

	str = os.Getenv("HTTP_ADDRESS")
	if str == "" {
		str = "localhost:8080"
	}
	rt.httpAddress = str

	return nil
}
