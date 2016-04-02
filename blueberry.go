package main

import (
	"bitbucket.org/unrulyknight/scgi"
	"bitbucket.org/unrulyknight/xmlrpc"
	"github.com/julienschmidt/httprouter"

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
	router.GET("/rtorrent/list", rtlist)
	router.GET("/rtorrent/version", rtversion)
	router.ServeFiles("/public/*filepath", http.Dir("./www/public"))

	log.Fatal(http.ListenAndServe("localhost:8080", router))
}

func rtlist(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
	rtrequest(w, "d.multicall", []xmlrpc.Value{
		xmlrpc.NewString("main"),
		xmlrpc.NewString("d.base_filename="),
		xmlrpc.NewString("d.base_path="),
		xmlrpc.NewString("d.bytes_done="),
		xmlrpc.NewString("d.is_private=")})
}

func rtversion(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
	rtrequest(w, "system.client_version", nil)
}

func rtrequest(w http.ResponseWriter, methodName string, params []xmlrpc.Value) {
	w.Header().Set("Content-Type", "text/plain")

	doc := xmlrpc.CreateRequest(methodName, params)
	response, err := rt.scgi.Request(doc)

	if err != nil {
		fmt.Fprintf(w, "Error: %s\n", err)
		return
	}

	values := xmlrpc.ParseResponse(response)
	for _, val := range values {
		fmt.Fprintf(w, "%s\n", val.Print())
	}
}
