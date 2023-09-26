/*
UDP (User Datagram Protocol): UDP is type of a core data transmission protocol (like TCP). It is part of the
transport layer.

It is less reliable than TCP as there is no three-way handshaking, or a acknowledgemnt received once data packets have 
been sent.
*/

//datagram package is used to set up a UDP connection
import * as dgram from "dgram";
import { captureRejectionSymbol } from "events";
import { Header } from "./header"
import { error, time } from "console";
import { resolve } from "path";
import { ParseResponse } from "./parse_response";

export class SocketUDP {
    rootserver: string;
    serverport: number;
    dnsQuery: string;
    parseresponse: ParseResponse;
    header: Header

    constructor() {
        /*
        Root Server
        Root servers are DNS nameservers that operate in the root zone. 
        These servers can directly answer queries for records stored or cached within the root zone
        */
        this.rootserver = "198.41.0.4"; //Google's DNS rootserver
        // this.rootserver = "8.8.8.8"
        this.serverport = 53;
        this.dnsQuery = "";
        this.parseresponse = new ParseResponse();
        this.header = new Header();
    }

    public get RootServer() {
        return this.rootserver;
    }

    public set RootServer(query: string) {
        this.rootserver = query;
    }

    public get DnsQuery() {
        return this.dnsQuery;
    }

    public set DnsQuery(query: string) {
        this.dnsQuery = query;
    }

    public binaryToHex(): string {
        //as every 4 bits of binary represent a bit in hexadecimal, we will make sure the string in a divisor of 4
        let dnsQuery = this.dnsQuery;
        while(dnsQuery.length % 4 != 0) {
            dnsQuery = "0" + dnsQuery;
        }

        let dnsQueryHex = "";

        for(let i=0;i<dnsQuery.length;i+=4) {
            let decimal = parseInt(dnsQuery.substr(i,4), 2);

            let hex = decimal.toString(16);

            dnsQueryHex = dnsQueryHex + hex;
        }

        return dnsQueryHex;
    };


    async sendQueryToRootServer() {
        const client = dgram.createSocket('udp4');
        let dnsQuery = this.dnsQuery;

        dnsQuery = this.binaryToHex();

        //Buffer is used to package my hex data into protocol specific format
        const message = Buffer.from(dnsQuery, "hex");
        // console.log(dnsQuery)

        return new Promise<any>((resolve, reject) => {
            let messageResponse = "";
            client.send(message, 0, message.length, this.serverport, this.rootserver, (error) => {
                if(error) {
                    console.error("Message was not sent due to: ", error);
                    reject(error);
                    client.close();
                } else {
                    // console.log("Message sent successfully");

                    client.on('message', async (response, remote) => {
                        // console.log("Response received from rootserver: ", this.rootserver, " and port :", this.serverport);
                        // console.log("Response => ", response.toString("hex"));
                        messageResponse = response.toString("hex");
                        // console.log("MessageResponse: ", messageResponse)
                        this.parseresponse.DnsResponse = messageResponse;

                        // console.log("Check this: ", this.parseresponse.DnsResponse)
                        let answer = await this.parseresponse.extractAnswerRecords();

                        if(answer.substr(0, 13) == "CNAMEcallback") {
                            let cname = answer.substr(13);
                            this.rootserver = "198.41.0.4";
                            this.dnsQuery = this.header.toBinaryString(cname);
                            resolve(await this.sendQueryToRootServer());
                        }

                        if(answer.substr(0, 8) == "callback") {
                            let ip = answer.substr(8);
                            this.rootserver = ip;
                            // console.log("CNAME ke baad ka h: ", this.rootserver);
                            resolve(await this.sendQueryToRootServer());
                        }

                        // console.log("IP Address: ", answer);
                        resolve(answer);
                        // resolve(messageResponse);
                        client.close();
                    })
                }
            });

            client.on('error', (error) => {
                console.error('Socket error:', error);
                reject(error);
                client.close();
            });
        });
    }

    // async nameServerResponse(dnsString: string) {
    //     return new Promise((resolve, reject) => {
    //         let response  = this.sendQueryToRootServer(dnsString);
    //         if(response === "") {
    //             reject(error);
    //         } else {
    //             resolve(response);
    //         }
    //     });
    // }
}

/*
const h = new Header();
const y = h.toBinaryString("dns.google.com");

const socket = new SocketUDP();
socket.DnsQuery = y;

// // socket.nameServerResponse(y).then((response) => {
// //     console.log(response);
// // }).catch((error) => {
// //     console.log(error);
// // });

socket.sendQueryToRootServer().then((response) => {
    console.log("Aman ", response);
}).catch ((error) => {
    console.log(error);
});
*/
