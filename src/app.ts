import { Header } from "./header";
import { SocketUDP } from "./socket";
import { ParseResponse } from "./parse_response";

 export class Execute {
    header: Header
    socket: SocketUDP
    parseresponse: ParseResponse
    nameServerResponse: any

    public constructor() {
        this.header = new Header();
        this.socket = new SocketUDP();
        this.parseresponse = new ParseResponse();
        this.nameServerResponse = "";
    }

    public execution(name: string): string {
        // const x = this.header.toBinaryString("dns.google.com");
        console.log("Resolving DNS for: ", name)
        const x = this.header.toBinaryString(name);

        this.socket.DnsQuery = x;
        let answer = "";
        //promise from socketUDP class
        this.socket.sendQueryToRootServer().then((response) => {
            this.nameServerResponse = response
            // this.parseresponse.DnsResponse = this.nameServerResponse
            // this.parseresponse.extractAnswerRecords();
            answer = response;
        }).catch ((error) => {
            console.log("Resolving DNS Query Failed");
            console.log(error);
        });

        return answer;
    }
}

const exe = new Execute();
// exe.execution("dns.google.com");
exe.execution("www.urbanladder.com");
// exe.execution("images.google.com");
// exe.execution("www.google.com");