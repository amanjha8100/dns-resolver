//Check this out for understanding header => https://datatracker.ietf.org/doc/html/rfc1035#section-4.1.1

/*

Can Refer this also => https://cabulous.medium.com/dns-message-how-to-read-query-and-response-message-cfebcb4fe817


The structure of the header without questions

    +--+--+--+--+--+--+--+--+--+--+--+--+--+--+--+--+
    |                      ID                       |
    +--+--+--+--+--+--+--+--+--+--+--+--+--+--+--+--+
    |QR|   Opcode  |AA|TC|RD|RA|   Z    |   RCODE   |
    +--+--+--+--+--+--+--+--+--+--+--+--+--+--+--+--+
    |                    QDCOUNT                    |
    +--+--+--+--+--+--+--+--+--+--+--+--+--+--+--+--+
    |                    ANCOUNT                    |
    +--+--+--+--+--+--+--+--+--+--+--+--+--+--+--+--+
    |                    NSCOUNT                    |
    +--+--+--+--+--+--+--+--+--+--+--+--+--+--+--+--+
    |                    ARCOUNT                    |
    +--+--+--+--+--+--+--+--+--+--+--+--+--+--+--+--+

*/

export class Header {
    ID: number;
    FLAGS: string;
    QDCOUNT: number; // Number of Questions
    ANCOUNT: number; // Answer Resource Records
    NSCOUNT: number; // Authority Resource Records
    ARCOUNT: number; // Additional Resource Records
    QTYPE: number; //Represents the type of resorce record to be resolved by name server
    QCLASS: number; //Reprsents class of the Query
    constructor() {
        this.ID = 22;
        this.FLAGS = "0000000100000000"; // Initialize FLAGS with the Recursion Desired (RD) flag set to 1
        this.QDCOUNT = 1;
        this.ANCOUNT = 0;
        this.NSCOUNT = 0;
        this.ARCOUNT = 0;
        this.QTYPE = 1; //set it to class "A", representing that it is to resolve a domain name to IpV4 address
        this.QCLASS = 1; //set to 1, which the internet class

    }

    public encodeURL(domain: string): string {
        //convert dns.google.com to 3dns6google3com0
        //QNAME field structure is as follows => A domain name represented as a sequence of labels, 
        //where each label consists of a length octet followed by that number of octets. 
        const wordArray = domain.split(".");
        
        var labelBinary = "";
        for(let i=0;i<wordArray.length;i++) {
            const length_of_label = wordArray[i].length;
            labelBinary = labelBinary + length_of_label.toString(2).padStart(8, '0');
            for(let j=0;j<wordArray[i].length;j++) {
                const ascii = wordArray[i].charCodeAt(j);
                labelBinary = labelBinary + ascii.toString(2).padStart(8, '0');
            }
        }
        
        //the end of the binary domain name should be followed by a 1 byte zero
        labelBinary = labelBinary + "00000000";

        return labelBinary;
    }

    public toBinaryString(url: string): string {
        //convert the ID and FLAGS to its binary representation
        const idBinary = this.ID.toString(2).padStart(16, '0');
        const flagsBinary = this.FLAGS;
        const qdcountBinary = this.QDCOUNT.toString(2).padStart(16, '0');
        const ancountBinary = this.ANCOUNT.toString(2).padStart(16, '0');
        const nscountBinary = this.NSCOUNT.toString(2).padStart(16, '0');
        const arcountBinary = this.ARCOUNT.toString(2).padStart(16, '0');
        const urlBinary = this.encodeURL(url);
        const qtypeBinary = this.QTYPE.toString(2).padStart(16,'0');
        const qclassBinary = this.QCLASS.toString(2).padStart(16, '0');

        //setting
        return idBinary + flagsBinary + qdcountBinary + ancountBinary + nscountBinary + arcountBinary + urlBinary + qtypeBinary + qclassBinary;
    }
}

/*
const x = new Header();
x.name();
// const ans = x.toBinaryString("dns.google.com");
// console.log(ans);
const y = x.toBinaryString("dns.google.com");
*/