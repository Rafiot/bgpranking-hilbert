//<![CDATA[

var txt_1 = "ICMP echo";
var txt_2 = "Port open";
var txt_3 = "Port open reset";
var txt_4 = "Port open timeout";
var txt_5 = "Port reset/closed";
var txt_6 = "Reverse DNS";

var infos = [
"418 Million IP addresses that responded to ICMP Ping at least 2 times between June 2012 and October 2012",
"165 Million IP addresses that had one or more of the Top 150 ports open and the port returned data in response to a service probe between June 2012 and October 2012",
"7.6 Million IP addresses that had one or more of the Top 150 ports open but the remote host reseted the connection without sending data more that 5 times between June 2012 and October 2012",
"15 Million IP addresses that had one or more of the Top 150 Port open but the connection timouted without sending data more than 5 times between June 2012 and October 2012",
"152 Million IP addresses that had one or more of the Top 150 Ports closed or the connection was reseted by a firewall. Contains only IP addresses that did that more and 8 times between June 2012 and October 2012",
"1051 Million IP addresses that had a reverse DNS entry between June 2012 and October 2012"
];

var datasets = [

    { kind:txt_1, info:infos[0], path:"../out/ips_2011-12-27/"},
    null
];
