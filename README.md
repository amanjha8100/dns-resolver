# DNS Resolver

## To run the project
```
npm start
```

It will then ask for an input, enter the URL and it will do the rest.

## Output

![alt text](https://drive.google.com/file/d/1ytpOjlB_ISKIB8YSrqxDRIKdEnPlFAuN/view?usp=sharing)
## Concept

So we make a dns query with recursive = true, and other flags set to zero. Once we have created a dns query we use the UDP
protocol to send the dns query to the defined root server. The root server returns a response with three fields Authority , additional and answers. If answer is greater than zero then we resolve/decode the answers, taking into consideration, the dns message compression technique as well. 

In the dns message compression technique, the first two bytes (16 bits) are set to "11" (binary) or "c0" (hex), followed by another 16 bits containing the pointer to the part of the message that has to be decoded.

ex => c017 (hex), would mean decode the message at pointer 17 of the answer.

In case the answer is zero we make calls to authorative server to return a resolved Ip in one of its subsequent calls.

In case the resolved answer is a CNAME (Canonical name) rather than an IP address, we would again make calls with this CNAME, to the root server, to return us the IP address in one of the subsequent calls.


