var socketIO = require('socket.io'),
    uuid = require('node-uuid'),
    crypto = require('crypto'),
    request = require('request')

module.exports = function (server, config) {
    var io = socketIO.listen(server);
    var mappingArray = [];

    function getCurrentTime() {
      var tzoffset = (new Date()).getTimezoneOffset() * 60000; //offset in milliseconds
      var localISOTime = (new Date(Date.now() - tzoffset)).toISOString().slice(0, -1);

      return localISOTime;
    }

    function getConnectedPeers(){
	     return mappingArray;
    }

    function getPeerIdFromSessionId(sessionId){
        for (var index = 0; index < mappingArray.length; index++) {
            if(mappingArray[index].sid === sessionId){
                return mappingArray[index].obId;
            }
        }
    }

    function getSessionIdFromPeerId(peerId){
        for (var index = 0; index < mappingArray.length; index++) {
            if(mappingArray[index].obId === peerId){
                return mappingArray[index].sid;
            }
        }
    }

    function removeConnectedPeer(peerId){
        for (var index = 0; index < mappingArray.length; index++) {
            if(mappingArray[index].obId === peerId){
              console.log('[',getCurrentTime(),']', '[removeConnectedPeer] ', mappingArray[index].obId, ' has disconnected');
                 mappingArray.splice(index, 1);
            }
        }
    }

    function checkPeerExistenceAndAvailability(peerId){
        for (var index = 0; index < mappingArray.length; index++) {
            if(mappingArray[index].obId === peerId){
              if(mappingArray[index].isAvailable) {
                console.log('[',getCurrentTime(),']', '[checkPeerExistenceAndAvailability] ', peerId, ' exists and is available')
              }
              else {
                console.log('[',getCurrentTime(),']', '[checkPeerExistenceAndAvailability] ', peerId, ' exists and is busy')
              }
                return {
		  exists: true,
	          isAvailable: mappingArray[index].isAvailable,
		}
            }
        }
    }

    function checkIfPeerIdExists(peerId){
        for (var index = 0; index < mappingArray.length; index++) {
            if(mappingArray[index].obId === peerId){
                return true;
            }
        }
    }

    function pushPeerIdAndSessionId(peerId, sessionId){
        if(checkIfPeerIdExists(peerId)){
          for (var index = 0; index < mappingArray.length; index++) {
            if(mappingArray[index].obId === peerId){
                mappingArray[index].sid = sessionId;
		mappingArray[index].isAvailable = true;
            }
          }
        }else{
          var usrObj = {
                obId: peerId,
                sid: sessionId,
		isAvailable: true,
          };
          mappingArray.push(usrObj);
        }
    }

    function changeSelfState(currentPeerId, isAvailable){
        for(var index = 0; index < mappingArray.length; index++) {
          if(mappingArray[index].obId === currentPeerId) {
            if(isAvailable){
              console.log('[',getCurrentTime(),']','[changeSelfState] Changing state of ', mappingArray[index].obId, ' to available')
            }
            else {
              console.log('[',getCurrentTime(),']','[changeSelfState] Changing state of ', mappingArray[index].obId, ' busy')
            }
            mappingArray[index].isAvailable = isAvailable;
          }
        }
    }

    function changePeersState(remotePeerId, currentPeerId, isAvailable){
        for(var index = 0; index < mappingArray.length; index++) {
          if(mappingArray[index].obId === remotePeerId || mappingArray[index].obId === currentPeerId) {
            if(mappingArray[index].isAvailable){
              console.log('[',getCurrentTime(),']','[changePeersState] Changing state of ', mappingArray[index].obId, ' to busy')
            }
            else {
              console.log('[',getCurrentTime(),']','[changePeersState] Changing state of ', mappingArray[index].obId, ' to available')
            }
            mappingArray[index].isAvailable = isAvailable;
          }
        }
    }

	function changeAvailibiltyOfPeerListings(peerID, availabilityStatus) {
    request.put('http://localhost:5002/listing/availabilityStatus', {
      form:{
        peerID:peerID,
        availability: availabilityStatus
      }
    })
	}

    io.sockets.on('connection', function (client) {
        client.resources = {
            screen: false,
            video: true,
            audio: false
        };

	      client.emit('connectionReady');

	      client.on('initializeSession', function(data){
	          console.log('[', getCurrentTime(),']', '[on.initializeSession] User ', data.obId, ' has connected');
            pushPeerIdAndSessionId(data.obId, data.sid);
	          client.emit('logConnectedPeers', mappingArray);
		        changeAvailibiltyOfPeerListings(data.obId, 1);
	      });

       client.on('call', function(data){
    	    if(!data) return;
            console.log('[',getCurrentTime(),']','[on.Call] Checking ', data.to, ' existence and availability')
            var peerExistence = checkPeerExistenceAndAvailability(data.to);
            if(typeof peerExistence !== 'undefined' && peerExistence.exists){
             if(peerExistence.isAvailable){

	              var sessionId = getSessionIdFromPeerId(data.to);
        	      var otherClient = io.to(sessionId);
                console.log('[',getCurrentTime(),']', '[on.Call] Changing peers state');
        	      changePeersState(data.to, data.from, false);

        	      if(!otherClient) {
                  console.log('[',getCurrentTime(),']','[on.Call] User ', data.to, ' is offline, does not exist or an error occured. Emitting userOffline event');
                  console.log(otherClient);
                  client.emit('userOffline');
                }

        	      var returnData = {
           	      roomId: data.createdRoomId,
           	      from: data.from,
           	      remotePeerName: data.remotePeerName,
           	      listingName: data.listingName,
           	      avatarHashes: data.avatarHashes,
        	      }
                console.log('[',getCurrentTime(),']','[on.Call] User ', data.from, ' is calling ', data.to, ' . Emitting call event');

        	      otherClient.emit('call', returnData);
      	     }
      	     else{
               console.log('[on.Call] User ', data.to, ' is busy. Emitting userBusy event');
          	   client.emit('userBusy');
      	     }
    	    }
    	    else{
            console.log('[',getCurrentTime(),']','[on.Call] User ', data.to, 'is offline. Emitting userOffline event');
      		  client.emit('userOffline');
    	    }
  	});

      client.on('declineCall', function(data){
      	    if(!data) return;
              console.log('[',getCurrentTime(),']','[on.declineCall] Checking ', data.to, ' existence and availability')
            var peerExistence = checkPeerExistenceAndAvailability(data.to);

            if(typeof peerExistence !== 'undefined' && peerExistence.exists) {
               console.log('[',getCurrentTime(),']','[on.declineCall] Changing peers state');
               changePeersState(data.to, data.from, true);
               var sessionId = getSessionIdFromPeerId(data.to);
               var otherClient = io.to(sessionId);

               if(!otherClient){
                 console.log('[',getCurrentTime(),']','[on.declineCall] User ', data.to, ' is offline, does not exist or an error occured. Emitting userOffline event');
                 console.log(otherClient);
                 client.emit('userOffline');
                }
               console.log('[',getCurrentTime(),']','[on.declineCall] User ', data.from, ' has declined call from', data.to, ' . Emitting declined event')
               otherClient.emit('declined', data.from);
            }
      	    else{
               console.log('[',getCurrentTime(),']','[on.declineCall] User ', data.to, 'is offline. Emitting userOffline event');
               client.emit('userOffline');
	          }
      });

  	client.on('endCall', function(data) {
    	   if(!data) return;
         console.log('[',getCurrentTime(),']','[on.endCall] Checking ', data.to, ' existence and availability')
    	   var peerExistence = checkPeerExistenceAndAvailability(data.to);

    	   if(typeof peerExistence !== 'undefined' && peerExistence.exists){
           console.log('[',getCurrentTime(),']','[on.endCall] Changing peers state');
      	       	changePeersState(data.to, data.from, true);
      		var sessionId = getSessionIdFromPeerId(data.to);
      		var otherClient = io.to(sessionId);

      	   if(!otherClient){
             console.log('[',getCurrentTime(),']','[on.endCall] User ', data.to, ' is offline, does not exist or an error occured. Emitting userOffline event');
             console.log(otherClient);
             client.emit('userOffline');
           }
           console.log('[',getCurrentTime(),']','[onEndCall] User ', data.from, ' has ended the call with', data.to , ' . Emitting callEnded event');
           otherClient.emit('callEnded', data.from);
    	   }
    	   else{
          console.log('[',getCurrentTime(),']','[on.endCall] User ', data.to, 'is offline. Emitting userOffline event');
      		client.emit('userOffline');
   	    }
 	  });

  	client.on('timeOut', function(data){
   	   if(!data) return;
         console.log('[',getCurrentTime(),']','[on.timeOut] Checking ', data.to, ' existence and availability')
    	   var peerExistence = checkPeerExistenceAndAvailability(data.to);

    	   if(typeof peerExistence !== 'undefined' && peerExistence.exists) {
          console.log('[',getCurrentTime(),']','[on.timeOut] Changing peers state');
  		    changePeersState(data.to, data.from, true);
      		var sessionId = getSessionIdFromPeerId(data.to);
      		var otherClient = io.to(sessionId);

                if(!otherClient){
                  console.log('[',getCurrentTime(),']','[on.timeOut] User ', data.to, ' is offline, does not exist or an error occured. Emitting userOffline event');
                  console.log(otherClient);
                  client.emit('userOffline');
                }
          console.log('[',getCurrentTime(),']','[on.timeOut] Connection has timed out. Emitting timedOut event to ', data.to);
      		otherClient.emit('timedOut', data.from);
           }
    	   else{
          console.log('[',getCurrentTime(),']','[on.timedOut] User ', data.to, 'is offline. Emitting userOffline event');
      		client.emit('userOffline');
    	   }
  	});

  	client.on('acceptCall', function(data){
  	   if(!data) return;
       console.log('[',getCurrentTime(),']','[on.acceptCall] Checking ', data.to, ' existence and availability')

       var peerExistence = checkPeerExistenceAndAvailability(data.to);
       var clientPeerId = getPeerIdFromSessionId(client.id);

  	   if(typeof peerExistence !== 'undefined' && peerExistence.exists){
  	      var sessionId = getSessionIdFromPeerId(data.to);
  	      var otherClient = io.to(sessionId);

  	      if(!otherClient){
            console.log('[',getCurrentTime(),']','[on.acceptCall] User ', data.to, ' is offline, does not exist or an error occured. Emitting userOffline event');
            console.log(otherClient);
            client.emit('userOffline');
          }
          console.log('[',getCurrentTime(),']','[on.acceptCall] User ', clientPeerId, ' has accepted call from ', data.to, ' . Emitting accepted event')
  	      otherClient.emit('accepted', data.from);
  	   }
  	   else{
          console.log('[',getCurrentTime(),']','[on.accpetCall] User ', data.to, 'is offline. Emitting userOffline event');
  	      client.emit('userOffline');
  	   }
  	});

  	client.on('changeSelfState', function(data){
  	  if(!data) return;

      console.log('[',getCurrentTime(),']','[on.changeSelfState] Checking ', data.from, ' existence and availability')
      var peerExistence = checkPeerExistenceAndAvailability(data.from);

  	  if(typeof peerExistence !== 'undefined' && peerExistence.exists){
        console.log('[',getCurrentTime(),']','[on.changeSelfState] About to change self state of ', data.from);
  	    changeSelfState(data.from, true);
  	  }
  	});

    client.on('changeSdp', function(data) {
      if(!data) return;

      var peerExistence = checkPeerExistenceAndAvailability(data.to);

      if(typeof peerExistence !== 'undefined' && peerExistence.exists){
        console.log('After if in change sdp');
        var sessionId = getSessionIdFromPeerId(data.to);
        var otherClient = io.to(sessionId);

	console.log('[',getCurrentTime(),']','[on.changeSdp] Changing sdp of ', data.to);

        if(!otherClient) {
          return;
        }

        otherClient.emit('sdpChanged', { data: data.data, from: data.from });
      }
    });

        // pass a message to another id
	 client.on('message', function (details) {
            if (!details) return;

            var otherClient = io.to(details.to);
            if (!otherClient) return;

            details.from = client.id;
            otherClient.emit('message', details);
        });

        client.on('shareScreen', function () {
            client.resources.screen = true;
        });

        client.on('unshareScreen', function (type) {
            client.resources.screen = false;
            removeFeed('screen');
        });

        client.on('join', join);

        function removeFeed(type) {
	          console.log("[removeFeed]", client.room, client.id);

            if (client.room) {
                io.sockets.in(client.room).emit('remove', {
                    id: client.id,
                    type: type
                });
                if (!type) {
                    client.leave(client.room);
                    client.room = undefined;
                }
            }
        }

        function join(name, cb) {
            // sanity check
            if (typeof name !== 'string') return;
            // check if maximum number of clients reached
            if (config.rooms && config.rooms.maxClients > 0 &&
                clientsInRoom(name) >= config.rooms.maxClients) {
                safeCb(cb)('full');
                return;
            }
            // leave any existing rooms
            removeFeed();
            safeCb(cb)(null, describeRoom(name));
            client.join(name);
            client.room = name;
        }

        // we don't want to pass "leave" directly because the
        // event type string of "socket end" gets passed too.
        client.on('disconnect', function () {
	         console.log("[disconnect] client has disconnected");
           removeFeed();
	         var peerId = getPeerIdFromSessionId(client.id);
		       changeAvailibiltyOfPeerListings(peerId, 0);
	         removeConnectedPeer(peerId);
	         io.emit('peerDisconnected', peerId);
        });

        client.on('leave', function () {
            removeFeed();
        });

        client.on('create', function (name, cb) {
            if (arguments.length == 2) {
                cb = (typeof cb == 'function') ? cb : function () {};
                name = name || uuid();
            } else {
                cb = name;
                name = uuid();
            }
            // check if exists
            var room = io.nsps['/'].adapter.rooms[name];
            if (room && room.length) {
                safeCb(cb)('taken');
            } else {
                join(name);
                safeCb(cb)(null, name);
            }
        });

        // support for logging full webrtc traces to stdout
        // useful for large-scale error monitoring
        client.on('trace', function (data) {
            console.log('trace', JSON.stringify(
            [data.type, data.session, data.prefix, data.peer, data.time, data.value]
            ));
        });


        // tell client about stun and turn servers and generate nonces
        client.emit('stunservers', config.stunservers || []);

        // create shared secret nonces for TURN authentication
        // the process is described in draft-uberti-behave-turn-rest
        var credentials = [];
        // allow selectively vending turn credentials based on origin.
        var origin = client.handshake.headers.origin;
        if (!config.turnorigins || config.turnorigins.indexOf(origin) !== -1) {
            config.turnservers.forEach(function (server) {
//                var hmac = crypto.createHmac('sha1', server.secret);
                // default to 86400 seconds timeout unless specified
//                var username = Math.floor(new Date().getTime() / 1000) + (parseInt(server.expiry || 86400, 10)) + "";
//                hmac.update(username);

              credentials.push({
//                    username: username,
//                    credential: hmac.digest('base64'),
                    username: server.username,
		    credential: server.credential,
		     urls: server.urls || server.url
                });
            });
        }
        client.emit('turnservers', credentials);
    });


    function describeRoom(name) {
        var adapter = io.nsps['/'].adapter;
        var clients = adapter.rooms[name] || {};
        var result = {
            clients: {}
        };
        Object.keys(clients).forEach(function (id) {
            result.clients[id] = adapter.nsp.connected[id].resources;
        });
        return result;
    }

    function clientsInRoom(name) {
        return io.sockets.clients(name).length;
    }

};

function safeCb(cb) {
    if (typeof cb === 'function') {
        return cb;
    } else {
	return function() {};
    }
}
