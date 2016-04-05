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
	router.POST("/rtorrent/request", rtrequest)
	router.ServeFiles("/public/*filepath", http.Dir("./www/public"))

	log.Fatal(http.ListenAndServe("localhost:8080", router))
}

func rtrequest(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
	w.Header().Set("Content-Type", "text/plain")

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

	values := xmlrpc.ParseResponse(response)
	for _, val := range values {
		fmt.Fprintf(w, "%s\n", val.Print())
	}
}
