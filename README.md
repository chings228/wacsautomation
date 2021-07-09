# wacsautomation
automatic get cert from let's encrypt with apache using in windows 


<h3>for installation </h3>


run npm i 
after download

copy the config_template.txt to a config.txt file

change the parameter you needed

such as key directory , wacs location , etc 

<h3>Usage</h3>
<b>after , pls run node ssl.com </b>


1. will create directories if needed

2. check the domain ip is same as the hostip specificed in the config file 

3. check any existing key , and the validation date , ignore if expiry date is more than 30 days

4.  a temporary vhost file will be created for port 80 validation by let's encrypt , why , because to avoid any redirect to make the validation fails

5.  after all the key has sucessfully been fetched, a new vhost and ssl file for apache virtual host will be generated


<h2> Please make a copy of your conf directory under apache before you procced , you can restore if anything becomes weird</h2>
