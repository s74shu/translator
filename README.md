# translator

Setup server side on ubuntu
1 Install ffmpeg

2 install node && npm https://tecadmin.net/install-latest-nodejs-npm-on-ubuntu/
  sudo apt-get install curl python-software-properties
  curl -sL https://deb.nodesource.com/setup_8.x | sudo -E bash -
  sudo apt-get install nodejs

  check: node -v ; npm -v

3 Install Kurento Media Server
 http://builds.kurento.org/dev/master/latest/docs/installation_guide.html
 echo "deb http://ubuntu.kurento.org trusty kms6" | sudo tee /etc/apt/sources.list.d/kurento.list
 wget -O - http://ubuntu.kurento.org/kurento.gpg.key | sudo apt-key add -
 sudo apt-get update
 sudo apt-get install kurento-media-server-6.0
 sudo service kurento-media-server-6.0 start

4 Install app with kurrento-rtmp
  git clone https://github.com/s74shu/translator.git
  node server.js
