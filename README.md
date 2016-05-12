# neo4j-alert

Regularly emit request to a neo4j base and send messages when the data changes
Runs on node.js, using mongoDB and neo4j

This is just a proof of concept made for fun


** Install **

1. Clone the repo
2. run "npm install" to get the modules
3. edit the config file
4. launch mongoDB and neo4j
5. run "node app"

** Config **

The cypher must contain a "RETURN" statement.
Query parameters are not supported. (Although it would take minimal changes to support them)

The frequency syntax can be found here : https://github.com/rschmukler/human-interval
