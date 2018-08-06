const NodeMediaServer = require('node-media-server');
var net = require('net');
var fr = require('FileReader');
var path = require('path');
var url = require('url');
var cookieParser = require('cookie-parser')
var express = require('express');
var session = require('express-session')
var minimist = require('minimist');
var ws = require('ws');
var fs = require('fs');
var http = require('http');
var https = require('https');
var childProcess = require('child_process');
var spawn = childProcess.spawn;
var cookie = require('cookie');
var FileAPI = require('file-api')
  , File = FileAPI.File
  , FileList = FileAPI.FileList
  , FileReader = FileAPI.FileReader
  ;
var options =
    {
        //key: fs.readFileSync('keys/server.key'),
        //cert: fs.readFileSync('keys/server.crt')
        key: fs.readFileSync('keys/domain.key'),
        cert: fs.readFileSync('keys/domain.crt')
    };
const app = express(); 

var session_index = 0;
/*
 * Management of sessions
 */




/*
 * Definition of global variables.
 */
var sessions = {};
var streamurl = new url.URL('https://localhost');
//var candidatesQueue = {};
/*
 * Server startup
 */

//var bserver = binaryServer({port: 8000});
var mwss = new ws.Server({ noServer: true });
mwss.binaryType = "arrayBuffer";
var wss = new ws.Server({ noServer: true });
var port = '8443';
//asUrl = 'https://localhost:8443/';
var server = https.createServer(options, app).listen(port, function () {
    console.log('MBS started');
//    console.log('Open ' + url.format(asUrl) + ' with a WebRTC capable browser');
});

server.on('upgrade', function upgrade(request, socket, head) {
  const pathname = url.parse(request.url).pathname;

  if (pathname === '/mbs') {
    wss.handleUpgrade(request, socket, head, function done(ws) {
      wss.emit('connection', ws, request);
    });
  } else if (pathname === '/mbsmedia') {
    mwss.handleUpgrade(request, socket, head, function done(ws) {
      mwss.emit('connection', ws, request);
    });
  } else {
    socket.destroy();
  }
});



/*var mwss = new ws.Server({
    server: server,
    path: '/mbsmedia'
});
var wss = new ws.Server({
    server: server,
    path: '/mbs'
});


var mserver = net.createServer( function(mediastream) {
    console.log('client connected');
    //mediastream.pipe(stdin);

                  });
mserver.on('data', function(){
                       console.log('Received');
});
mserver.on('close', function(){
    console.log('Connection closed');
});
mserver.on('error', function(err){
    console.log(err.message);
                    });
mserver.listen(8000); 
*/

wss.on('connection', function connection(ws, req) {
    console.log('wss connect');
    ws.upgradeReq = req;
  //  var location = url.parse(ws.upgradeReq.url, true);

//    var cookies = cookie.parse(ws.upgradeReq.headers.cookie);

//    var wstream = fs.createWriteStream("");

    var sessionId = null;
//    var request = ws.upgradeReq;
    var response = {
        writeHead: {}
    };
    ws.on('error', function (error) {
        console.log('Connection ' + sessionId + ' error');
        stop(sessionId);
    });

    ws.on('close', function () {
        console.log('Connection ' + sessionId + ' closed');
        stop(sessionId);
    });

    ws.on('message', function (_message) {
        var message = JSON.parse(_message);
        console.log('Connection ' + sessionId + ' received message ', message);
        console.log(message.type);

        switch (message.id) {
            case 'sdp':
                console.log('Connection receive sdp');
                break;
            case 'mdata':
                break;
            case 'streamurl':
                var strmUrl = url.parse(message.streamurl);         
                var output = '';
                var outerr = '';       
                console.log('Receive url ',strmUrl.href);
                ffprbproc = spawn('ffprobe',['-hide_banner',
                                 '-loglevel', '16',
                                 '-show_streams',
                                 '-of', 'json',
                                 strmUrl.href]
                );
                
                ffprbproc.on('close', function(code){
                    var message;
                    if(code == 0)
                        ws.send(JSON.stringify({
                             id: 'ffprobe_result',
                             message: output
                        }));
                    else
                        ws.send(JSON.stringify({
                             id: 'ffprobe_error',
                             message: outerr
                        }));
                });
                ffprbproc.stdout.on('data', function(data) {
                    output = output+data;
                });
                ffprbproc.stderr.on('data', function(data) {
                    outerr = outerr+data;
                });
                break;
            case 'start':
                sessionId = request.session.id;
            
                break;
            case 'stop':
                stop(sessionId);
                break;
            default:
                ws.send(JSON.stringify({
                    id: 'error',
                    message: 'Invalid message ' + message
                }));
                break;
        }  
   });
});// wss kernel

var ffchild;
var wavstr;
var wavf;

mwss.on('connection', function connection(ws, req) {
  
    console.log('mwss connection');
     
//    ws.upgradeReq = req;
//    var location = url.parse(ws.upgradeReq.url, true);

//    var cookies = cookie.parse(ws.upgradeReq.headers.cookie);

//    var wstream = fs.createWriteStream("",{'encoding': 'binary'});

//    var sessionId = null;
//    var request = ws.upgradeReq;
//    var response = {
//        writeHead: {}
//    };
//    var fifoFilePath = 'mbs.pipe';
//    var mkfifoProcess = spawn('mkfifo',  [fifoFilePath]);
//    mkfifoProcess.on('exit', function (code) {
//       if (code == 0) {
//         console.log('fifo created: ' + fifoFilePath);
//       } else {
//         console.log('fail to create fifo with code:  ' + code);
//      }
//    });
    //wavstr = new wav.Writer({channels:1,sampleRate:48000,bitDepth:16});  
//    wavf = new wav.FileWriter('out.wav',{channels:1,sampleRate:48000,bitDepth:16});  
    ffchild = spawn('ffmpeg',['-hide_banner', '-thread_queue_size', '512', '-re', '-y',
                                '-f','f32le',
                                '-ac','1','-ar','48000','-i','pipe:0',
                                //'-i','http://devimages.apple.com/iphone/samples/bipbop/bipbopall.m3u8',
                                '-i', 'https://video-dev.github.io/streams/x36xhzz/x36xhzz.m3u8',
                                '-map', '0:a:0',
                                '-map', '1:a:0',
                                '-map', '1:v:0',
                                '-map', '1:a:1',
                                '-map', '1:v:1',
                                '-map', '1:a:2',
                                '-map', '1:v:2',
                                '-map', '1:a:3',
                                '-map', '1:v:3',
 
                                '-c:a:0','aac', '-strict','-2', '-b:a:0','192k',
                                '-c:a:1','copy',
                                '-c:a:2','copy',
                                '-c:a:3','copy',
                                '-c:a:4','copy',
                                '-c:v','copy',
                              /*  '-filter_complex', '"[0:a:0][1:a:0] amerge=inputs=2[a]"',
                                '-map', '0:1', '-map', '[a]', '-ar', '44100', '-ab', '70k', '-ac', '2', 
                                '-c:v', 'copy', i*/
                                //'-c:a', 'aac', '-strict', '-2', '-b:a','192k',  
                                
                                '-flags', '+global_header',
                                //'-f','hls','-hls_segment_filename', '-var_stream_map', '"a:0 a:1,v:1"',
                                //'/HLS/live/str_%v.ts',
                                //'/HLS/live/out_%v.m3u8'
                                '-f', 'ssegment', 
                                '-segment_list_size', '3', 
                                //'-hls_wrap', '4', '-hls_flags', 'delete_segments',
                                '-segment_start_number', '1',
                                '-segment_list_flags', '+live', '-segment_time', '10',
                                '-segment_list', '/HLS/live/playlist.m3u8',
                                '/HLS/live/0ut%03d.ts' 
                                /*'out.wav'*/]);
       //         ffchild.stdin.write(arrayBuffer);
    ffchild.stdin.setEncoding = 'binary';
    ffchild.stdout.on('data', function (data) {
//                 console.log('stdout: ' + data);
    });

    ffchild.stderr.on('data', function (data) {
//                 console.log('stderr: ' + data);
    });
/*                var ffchild = spawn('ffmpeg',['-re',
                                              'hide_bunner',
                                              '-i', 'mbs.pipe',
                                              '-c:a', 'aac', '-strict', '-2',
                                              '-f', 'flv',
                                              'rtmp://127.0.0.1:8083/myapp/mystream'    
                                   ]);
                //ffchild.stdin.write(message);
                ffchild.stdout.on('data', function (data) {
                 console.log('stdout: ' + data);
                });

                ffchild.stderr.on('data', function (data) {
                 console.log('stderr: ' + data);
              });///
*/
    ws.on('error', function (error) {
        console.log('Connection M' + /*sessionId + */' error');
        ffchild.stdin.end();
        //wavf.end();
        //stop(sessionId);
    });

    ws.on('close', function () {
        console.log('Connection M'/* + sessionId  */+' closed');
        ffchild.stdin.end();
        //stop(sessionId);
        //wavf.end();
    });

    ws.on('message', function (message) {
        var a = Buffer.from(message);
        //wavf.write(message.binaryData);
        //for(var i = 0; i < a.length ;i++){
        //console.log(a.readFloatLE(0), a.readFloatLE(4));
          
          
        //}
        //ffchild.stdin.write(a); 
        //console.log(a.length);   
        //console.log(a[0],a[1]);  
        //console.log(message.getInt16());
//        console.log(message[1]); 
        //message.pipe(ffchild.stdin);
        ffchild.stdin.write(a); 
        //console.log('receive message');
        //console.log(message);
                
  });
});//////////////


function start(sessionId, ws, sdpOffer, callback) {
    if (!sessionId) {
        return callback('Cannot use undefined sessionId');
    }

}

function parse_stream(href) {
    ffprbproc = spawn('ffprobe',['-hide_banner',
                                 '-loglevel', '16',
                                 '-show_streams',
                                 '-of', 'json',
                                 href]
                      );
    ffprbproc.on('close', function(code){
        console.log('code '+code);
    });
    /*ffprbproc.stdout.on('data', function (data) {
        console.log(' '+data);
        //var joutput = JSON.parse(data);
        //console.log('json',joutput);
    });
    ffprbproc.stderr.on('data', function (data) {
        console.log('ffprobe stderr '+data);
    });*/
}

app.use(express.static(path.join(__dirname, 'static')));
process.on('uncaughtException', function (error) {
    console.log(error);
});
