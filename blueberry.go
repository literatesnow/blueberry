package main

import (
	"fmt"

	"bitbucket.org/unrulyknight/scgi"
	"bitbucket.org/unrulyknight/xmlrpc"
)

func main() {
	cl := scgi.NewClient("tcp", "192.168.1.15:50000")

	//system.client_version, download_list

	doc := xmlrpc.CreateRequest("d.multicall", []xmlrpc.Value{
		xmlrpc.NewString("main"),
		xmlrpc.NewString("d.base_filename="),
		xmlrpc.NewString("d.base_path="),
		xmlrpc.NewString("d.bytes_done="),
		xmlrpc.NewString("d.is_private=")})

	response, err := cl.Request(doc)

	if err != nil {
		fmt.Printf("%s\n", err)
		return
	}

	fmt.Printf("%s\n", string(response.Bytes()))

	values := xmlrpc.ParseResponse(response)
	for _, val := range values {
		fmt.Printf("%s\n", val.Print())
	}
}
