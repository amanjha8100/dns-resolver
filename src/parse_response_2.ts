import { Socket } from "node:dgram";
import { after, skip } from "node:test";
import { SocketUDP } from "./socket";
import { Header } from "./header";
import { executionAsyncResource } from "node:async_hooks";
import { Execute } from "./app";
import { resolve } from "node:path";


export class ParseResponse2 {
    nameServerResponse: string;

    public constructor() {
        this.nameServerResponse = "";
    }

    public get DnsResponse() {
        return this.nameServerResponse;
    }

    public set DnsResponse(response: string) {
        this.nameServerResponse = response;
    }

    public parseDomainName(domain: string): string {
        //the length of the next label
        let domainanswer = "";
        while(true) {
            const octet = domain.substr(0, 2);
            const octetDecimal = parseInt(octet, 16);

            if(octetDecimal === 0) break;
            
            //reforming every label
            for (let i = 0; i < octetDecimal; i++) {
                const temp = domain.substring(2 + i * 2, 4 + i * 2);
                const ascii = parseInt(temp, 16);
                domainanswer += String.fromCharCode(ascii);
            }


            domainanswer+="."
            domain = domain.substring(2 + octetDecimal * 2);
        }
        // return domainanswer.substr(0, domainanswer.length-1);
        return domainanswer;
    }

    public processPointer(name: string): string {
        /*
        The next 8 bits are the offset, or the point from where the label has to be resolved
        */
        

        //the next 8 bits
        let copyy = this.nameServerResponse
        const pointerstring = name.substr(0, 4);
        const pointerStart = name.substr(2, 2);

        const pointerDecimal = parseInt(pointerStart, 16);
        // console.log("PointerOffset: ", pointerDecimal);

        //counting 12 bits from this.nameServerResponse

        // console.log("Check : ", copyy);

        let afterpointerbits = copyy.substr(pointerDecimal*2);
        // let skipheader = copyy.substr(24);
        // let afterpointerbits = skipheader.substr(pointerDecimal);

        // console.log("Check agian: ", afterpointerbits)

        //first two bits would be the label length;
        const resolvedpointeroffset = this.parseDomainName(afterpointerbits)
        // console.log("Pointer Resolve Kiya h: ",resolvedpointeroffset)

        return resolvedpointeroffset;

    }
    public processAddress(name: string): string {
        let ans = "";

        let address = name.substr(0, 8);
        let len = address.length;
        // console.log("Address Received: ", address);
        for(let i=0;i<len;i+=2) {
            let x = parseInt(address.substr(0,2), 16);
            ans+=x.toString();
            if(i != 6)
            ans+="."
            address = address.substr(2);
        }

        // console.log("IP Address: ", ans);
        return ans;
    }

    public moveAheadFromTypesAndEverything(name: string, type: boolean): string {
        /*
        type => 8 bit (2 octet)
        class => 8 bit (2 octet)
        ttl => 32 bit (4 octet)
        RDlength => 16 bit (2 octet)
        RData => variable bit, but in the scope of the project it is -> this can change according to if it is answer
        that is being resolved or the authority.
        */
        
        //removing type
        const typee = name.substr(0,4);
        name = name.substr(4);
        //removing class
        const class_ = name.substr(0, 4);
        name = name.substr(4);
        //removing ttl
        const ttl = name.substr(0, 8);
        name = name.substr(8);
        //removing data length
        const dataLengthString = name.substr(0, 4);
        const dataLengthDecimal = parseInt(dataLengthString, 16);
        name = name.substr(4);
        //removing address
        if(!type) {
            let xx = this.processAddress(name);
            name = name.substr(8);
        } else {
            name = name.substr(dataLengthDecimal*2);
            // console.log("Name dekhana : ", name);
        }
        return name;
    }
    
    //Had to use recursion as, there could be a pointer, pointing to another pointer
    //which on other hand would be pointing to another pointer.
    public recurseDomainName(name: string): string {
        const octet = name.substr(0,2);
        let resolvedstring = "";
        //base case
        if(octet == "00") {
            // console.log("Base case hit");
            return "";
        }
        const decimalOctet = parseInt(octet, 16);
        const pointer = decimalOctet & 192;

        if(pointer) {
            const pointerString = name.substr(0, 4);
            const pointerposition = parseInt(name.substr(2, 2), 16);

            resolvedstring += this.recurseDomainName(this.nameServerResponse.substr(pointerposition*2));
        } else {
            const labellength = parseInt(name.substr(0, 2), 16);
            // console.log("Labellength: ", name);
            let label = "";
            let start = 2;
            for(let i=0;i<labellength;i++) {
                let temp = name.substr(start, 2);
                // console.log("Temp: ", temp);
                let ascii = parseInt(temp, 16);
                // console.log("ascii: ", ascii);
                label += String.fromCharCode(ascii);
                start = start + 2;
            }

            resolvedstring +=  label + "." + this.recurseDomainName(name.substr(start));
        }

        return resolvedstring;
    }

    public getAuthorativeServer(name: string): string {
        const typee = name.substr(0,4);
        name = name.substr(4);
        //removing class
        const class_ = name.substr(0, 4);
        name = name.substr(4);
        //removing ttl
        const ttl = name.substr(0, 8);
        name = name.substr(8);
        //removing data length
        const dataLengthString = name.substr(0, 4);
        const dataLengthDecimal = parseInt(dataLengthString, 16);
        name = name.substr(4);

        let authServer = name.substr(0, dataLengthDecimal*2);

        let response = this.recurseDomainName(authServer);

        return response.substr(0, response.length-1);
    }

    public extractAnswerRecords(): string {
        // console.log("This is the response from Name server: ", this.nameServerResponse);

        const trasactionID = parseInt(this.nameServerResponse.substr(0, 4), 16);
        const flags = this.nameServerResponse.substr(4, 4);
        const questions = parseInt(this.nameServerResponse.substr(8,4), 16);
        const numberOfAnswerRecords = parseInt(this.nameServerResponse.substr(12,4), 16);

        const authority = parseInt(this.nameServerResponse.substr(16, 4), 16);
        const additionalRRs = parseInt(this.nameServerResponse.substr(20, 4), 16);

        // console.log(numberOfAnswerRecords);
        let offset = 24; 

        //resolving question part
        let y = this.nameServerResponse.substr(offset);
        let copyy = this.nameServerResponse;

        let domain = "";
        while(true) {
            const octet = y.substr(0, 2);
            const octetDecimal = parseInt(octet, 16);

            if(octetDecimal === 0) break;
            
            //reforming every label
            for (let i = 0; i < octetDecimal; i++) {
                const temp = y.substring(2 + i * 2, 4 + i * 2);
                const ascii = parseInt(temp, 16);
                domain += String.fromCharCode(ascii);
            }


            domain+="."
            y = y.substring(2 + octetDecimal * 2);
        }

        /*
        structure of response from name server

        +--+--+--+--+--+--+--+--+--+--+--+--+--+--+--+--+
        |                      Name                     |
        +--+--+--+--+--+--+--+--+--+--+--+--+--+--+--+--+
        |                      Type                     |
        +--+--+--+--+--+--+--+--+--+--+--+--+--+--+--+--+
        |                      class                    |
        +--+--+--+--+--+--+--+--+--+--+--+--+--+--+--+--+
        |                       TTL                     |
        +--+--+--+--+--+--+--+--+--+--+--+--+--+--+--+--+
        |                  Data Length                  |
        +--+--+--+--+--+--+--+--+--+--+--+--+--+--+--+--+
        |              Data Address/CNAME               |
        +--+--+--+--+--+--+--+--+--+--+--+--+--+--+--+--+


        */

        //levaing 2 bits for the "00" ending of the query question part
        let name = y.substr(2);
        const type = name.substr(0, 4);
        const responseClass = name.substr(4, 8);

        name  = name.substr(8);
        // console.log("Name: ", name,  " Type: ", type, " responseClass: ", responseClass);

        let domainResolvedAnswers = []
        if (numberOfAnswerRecords > 0) {
            for(let i=0;i<numberOfAnswerRecords;i++) {
                
                /*
                To save spaces while sending responses the name server , does not repeat itself. 
                Rather than if certain bits are same, then the name server points towards a part
                of the answer where originally its first occurrence was present.

                The start of a pointer starts with => 
                +--+--+--+--+--+--+--+--+--+--+--+--+--+--+--+--+
                | 1  1|                OFFSET                   |
                +--+--+--+--+--+--+--+--+--+--+--+--+--+--+--+--+

                so to check if it is a pointer we will check if the first two bits are set

                so if the first two bits are set => 11000000 (192 in decimal)
                */
                let sendString = "";
                let formedanswer = "";
                const octet = name.substr(0,2);
                const decimalOctet = parseInt(octet, 16);

                if(octet == "00") {
                    // name = this.moveAheadFromTypesAndEverything(name);
                    break;
                }
                const pointer = decimalOctet & 192;
                // console.log("Pointer: ", pointer);
                if(pointer) {
                    sendString = name.substr(0, 4);
                    formedanswer = this.recurseDomainName(sendString);
                    // console.log("Formed Answer: ", formedanswer);
                } else {
                    // console.log("Name aabar: ", name);
                    

                    //Jab tak 00 nhi milta tab tak form the sending string
                    let copyname = name;
                    while(true) {
                        let oct = copyname.substr(0,2);
                        let octDecimal = parseInt(oct, 16);

                        if(oct == "00") {
                            sendString += "00";
                            break;
                        }

                        sendString += oct;
                        copyname = copyname.substr(2);
                        
                        //as every ascii is stored in 8 bits/ 1 byte
                        sendString += copyname.substr(0, 2*octDecimal);
                        formedanswer = this.recurseDomainName(sendString);
                    }
                }

                // console.log("Name: ", name);
                name = name.substr(sendString.length);

                // console.log("naaam: ", name);
                const type = name.substr(0, 4);

                if(type == "0001") {
                    // console.log("Found!");
                    let namecopy = name;
                    namecopy = namecopy.substr(20);
                    namecopy = namecopy.substr(0, 8);

                    let ansaddress = this.processAddress(namecopy);
                    name = this.moveAheadFromTypesAndEverything(name, false);
                    return ansaddress;
                }

                // if(type === "0005") {
                //     const CNAME = this.getAuthorativeServer(name);
                //     console.log("CNAME:", CNAME);
                //     // const exe = new Execute();
                //     // const socket = new SocketUDP();
                //     // socket.RootServer = "198.41.0.4";
                //     // // const ansip = await socket.sendQueryToRootServer();
                //     // const ansip = await exe.execution(CNAME);
                //     // await exe.execution(CNAME);

                //     // exe.execution(CNAME);

                //     return "callback" + CNAME;
                // }

            }
        }

        //Answer not found in first query to the root server. Sending DNS query again to the authorative servers

        // console.log("Ekbaar naam dekhana: ", name)

        for(let i=0;i<authority;i++) {
            const octet = name.substr(0,2);
            const decimalOctet = parseInt(octet, 16);

            const pointer = decimalOctet & 192;

            let sendString = "";
            let formedanswer = "";

            if(pointer) {
                // console.log("ye deh lo: ", name);
                
                sendString = name.substr(0, 4);

                formedanswer = this.recurseDomainName(sendString);
            }
            else {  
                let copyname = name;
                while(true) {
                    let oct = copyname.substr(0,2);
                    let octDecimal = parseInt(oct, 16);

                    if(oct == "00") {
                        sendString += "00";
                        break;
                    }

                    sendString += oct;
                    copyname = copyname.substr(2);
                    
                    //as every ascii is stored in 8 bits/ 1 byte
                    sendString += copyname.substr(0, 2*octDecimal);
                    formedanswer = this.recurseDomainName(sendString);
                }
            }

            name = name.substr(sendString.length);

                // console.log("naaam: ", name);
            let type = name.substr(0, 4);

            let authorativeServerResponse = this.getAuthorativeServer(name);
            name = this.moveAheadFromTypesAndEverything(name, true);

            //Now making a dns query and sending it again to authorative server
            
            // console.log("Type: ", type);
            if(type == "0002") {
                // const exe = new Execute();
                // exe.execution(authorativeServerResponse);
                // console.log("Times executed: ", count);
                // count+=1;
                return "callback" + authorativeServerResponse;
            }
            


        }



        // const answerRecords = []
        // // for(let i=0;i<numberOfAnswerRecords;i++) {
        // for(let i=0;i<1;i++) {

        //     const domainName = this.parseDomainName(this.nameServerResponse, offset);
        //     const type = this.nameServerResponse.substr(offset + 4, 4);
        //     const dataLength = parseInt(this.nameServerResponse.substr(offset + 20, 4), 16);
        //     const data = this.nameServerResponse.substr(offset + 24, dataLength * 2);

        //     // Store the record in the answerRecords array
        //     answerRecords.push({ domainName, type, data });

        //     // Move the offset to the next record (adjusting for data length)
        //     offset += 24 + dataLength * 2;
        //     console.log("type: ",parseInt(type, 16)," data_length: ", dataLength, " offset: ", offset);
        // }

        return "";
    }
}

/*
101101000000110000000000000000000000100000000000000100000000000000000000000000000000000000011011001000110111001110011000001100110011101101111011011110110011101101100011001010000001101100011011011110110110100000000000000000000000100000000000000011100000000001100000000000000000100000000000000010000000000000000000000101101111000000000000001000000100000001000000001000000010011000000000011000000000000000001000000000000000100000000000000000000001011011110000000000000010000001000000010000000100000001000
*/