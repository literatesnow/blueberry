package main

import (
	"bitbucket.org/unrulyknight/scgi"
	"bitbucket.org/unrulyknight/xmlrpc"

	"github.com/julienschmidt/httprouter"

	"encoding/json"
	"fmt"
	"log"
	"net/http"
)

type rtorrent struct {
	scgi *scgi.Client
}

var rt rtorrent

func main() {
	rt = rtorrent{scgi: scgi.NewClient("tcp", "192.168.1.15:50000")}

	router := httprouter.New()
	router.POST("/rtorrent/request", rtrequest)
	router.ServeFiles("/public/*filepath", http.Dir("./www/public"))

	log.Fatal(http.ListenAndServe("localhost:8080", router))
}

func rtrequest(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
	w.Header().Set("Content-Type", "application/json")

	methodName, params, err := xmlrpc.ParseJsonRequest(r.Body)
	if err != nil {
		fmt.Fprintf(w, "Error: %s\n", err)
		return
	}

	doc := xmlrpc.CreateRequest(methodName, params)
	response, err := rt.scgi.Request(doc)

	if err != nil {
		fmt.Fprintf(w, "Error: %s\n", err)
		return
	}

	value, err := xmlrpc.ParseResponse(response)
	if err != nil {
		fmt.Fprintf(w, "Error: %s", err)
	}
	buf, err := json.Marshal(value)
	if err != nil {
		fmt.Fprintf(w, "Error: %s", err)
	} else {
		fmt.Fprintf(w, string(buf))
	}
}
