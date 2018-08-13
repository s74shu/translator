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
var ffchild;
var streamurl = new url.URL('https://motorsporttv.pc.cdn.bitgravity.com/live/ExtContent/moto3/MotoHLS/moto3.m3u8');
var channel = [];
/*
 * Server startup
 */

var mwss = new ws.Server({ noServer: true });
mwss.binaryType = "arrayBuffer";
var wss = new ws.Server({ noServer: true });
var port = '8443';
var server = https.createServer(options, app).listen(port, function () {
    console.log('MBS started');
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
            case 'hls_stream'://configure url and hls maps for ffmpeg
                streamurl = url.parse(message.streamurl).href;         
                for (let ndx in message.streams) {
                    if (message.streams[ndx] == true) 
                        channel.push(ndx);
                }
                ws.send(JSON.stringify({
                    id: 'hls_stream',
                    message: 'configured'
                }));
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


mwss.on('connection', function connection(ws, req) {
  
    console.log('mwss connection');
     
//    ws.upgradeReq = req;
//    var location = url.parse(ws.upgradeReq.url, true);

//    var cookies = cookie.parse(ws.upgradeReq.headers.cookie);

//    var request = ws.upgradeReq;
//    var response = {
//        writeHead: {}
//    };
    console.log(streamurl); 
    var stream_options = ['-hide_banner', '-thread_queue_size', '512', '-re', '-y',
                          '-f','f32le',
                          '-ac','1','-ar','48000','-i','pipe:0',
                          '-i', streamurl,
                          '-map', '0:a:0','-c:a:0','aac', '-strict','-2', '-b:a:0','192k'
                         ];
    channel.forEach(function(itm) {
                        stream_options.push('-map');stream_options.push('1:'+itm);
                        stream_options.push('-c:1:'+itm);stream_options.push('copy');
                    });
                        stream_options.push('-flags');   stream_options.push('+global_header');
                        stream_options.push('-f');       stream_options.push('hls');
                        stream_options.push('-hls_time');stream_options.push('3'); 
                        stream_options.push('-hls_wrap');stream_options.push('4');
                        stream_options.push('-hls_segment_filename');stream_options.push('/HLS/live/0ut%02d.ts');
                        stream_options.push('/HLS/live/playlist.m3u8');
    console.log(stream_options);
    ffchild = spawn('ffmpeg', stream_options );          
/*    ffchild = spawn('ffmpeg',['-hide_banner', '-thread_queue_size', '512', '-re', '-y',
                                '-f','f32le',
                                '-ac','1','-ar','48000','-i','pipe:0',
                                '-i', streamurl,
                                '-map', '0:a:0',
                                '-c:a:0','aac', '-strict','-2', '-b:a:0','192k',
                                '-map', '1:a:0',
                                '-map', '1:v:0',
                                '-map', '1:a:1',
                                '-map', '1:v:1',
                                '-map', '1:a:2',
                                '-map', '1:v:2',
                                '-map', '1:a:3',
                                '-map', '1:v:3',
 
                                '-c:a:1','copy',
                                '-c:a:2','copy',
                                '-c:a:3','copy',
                                '-c:a:4','copy',
                                '-c:v','copy',
                              //  '-filter_complex', '"[0:a:0][1:a:0] amerge=inputs=2[a]"',
                              //  '-map', '0:1', '-map', '[a]', '-ar', '44100', '-ab', '70k', '-ac', '2', 
                              //  '-c:v', 'copy', i
                                //'-c:a', 'aac', '-strict', '-2', '-b:a','192k',  
                                
                                '-flags', '+global_header',
                                //'-f','hls','-hls_segment_filename', '-var_stream_map', '"a:0 a:1,v:1"',
                                //'/HLS/live/str_%v.ts',
                                //'/HLS/live/out_%v.m3u8'
                                '-f', 'hls', 
                                '-hls_time', '3', '-hls_wrap', '4',
                                // hls_wrap is a deprecated option, you can use hls_list_size and 
                                // hls_flags delete_segments instead it. but in local version ffmpeg,
                                // delete_segments not working
                                //'-hls_list_size', '5', '-hls_flags', 'delete_segments',
                               
                                '-hls_segment_filename', '/HLS/live/0ut%02d.ts', 
                                '/HLS/live/playlist.m3u8'
                                ]);*/
       //         ffchild.stdin.write(arrayBuffer);
    ffchild.stdin.setEncoding = 'binary';
    ffchild.stdout.on('data', function (data) {
                 console.log('stdout: ' + data);
    });

    ffchild.stderr.on('data', function (data) {
                 console.log('stderr: ' + data);
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
        //stop(sessionId);
    });

    ws.on('close', function () {
        console.log('Connection M'/* + sessionId  */+' closed');
        ffchild.stdin.end();
        //stop(sessionId);
    });

    ws.on('message', function (message) {
        var a = Buffer.from(message);
        //ffchild.stdin.write(a); 
        //console.log(a.length);   
        //console.log(a[0],a[1]);  
        //console.log(message.getInt16());
//        console.log(message[1]); 
        //message.pipe(ffchild.stdin);
        ffchild.stdin.write(a); 
                
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
}

app.use(express.static(path.join(__dirname, 'static')));
process.on('uncaughtException', function (error) {
    console.log(error);
});
