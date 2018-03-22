import Video from '../views/modals/Video.js';
import incomingVideo from '../views/modals/IncomingCallModal.js';
import { openSimpleMessage } from '../views/modals/SimpleMessage';
import { launchNativeNotification } from './notification';
import { getAvatarBgImage } from './responsive';

export default class {
  constructor(options) {
    console.log('In client Socket Io');
    if (!options) {
      throw new Error('Please provide an url.');
    }
    const url = options.url;
    this.webRtc = options.webRtc;
    this.currentPeerId = options.currentPeerId;
    this.currentPeerName = options.currentPeerName;
    // Avatar hashes, which are used to access profile's image, they are passed when
    // calling a remote peer
    this.avatarHashes = options.avatarHashes;
    // io is improted from index.html
    this.socket = io.connect(url);
    this.attachSocketEvents();
  }

  // Used to create unique room name
  uuid() {
    var uuid = "", i, random;
    for (i = 0; i < 32; i++) {
      random = Math.random() * 16 | 0;

      if (i == 8 || i == 12 || i == 16 || i == 20) {
        uuid += "-"
      }
      uuid += (i == 12 ? 4 : (i == 16 ? (random & 3 | 8) : random)).toString(16);
    }
    return uuid;
  }

  playAlert() {
    this.incomingAlert = new Audio('../audio/IncomingCall.wav');
    this.incomingAlert.loop = true;
    this.incomingAlert.play();
  }

  stopAlert() {
    if (this.incomingAlert) {
      this.incomingAlert.pause();
      this.incomingAlert = null;
    }
  }

  attachSocketEvents() {
    this.socket.on('connectionReady', () => {
      console.log('Connection for ClientSocketIO is ready, begin to initialize session');
      if (this.videoObject) {
        this.iceRestart(null, true, 'connection ready');
      }
      this.socket.emit('initializeSession', { obId: this.currentPeerId, sid: this.socket.id });
    });
    this.socket.on('logConnectedPeers', (data) => {
      console.log(data);
    });
    this.socket.on('call', (data) => {
      console.log(`User ${data.from} is calling you`);
      console.log(`Id of the created room is ${data.roomId}`);
      this.playAlert();
      launchNativeNotification(`User ${data.remotePeerName} is calling you`);
      // Get remote peer's profile image
      var avatarURL = getAvatarBgImage(data.avatarHashes);
      // Create modal with two options Accept and Decline
      this.incomingCallObject = this.createIncomingCallModal(this.webRtc, data.roomId, data.from, data.remotePeerName, data.listingName, avatarURL);
    });
    this.socket.on('declined', (remotePeerId) => {
      if (this.videoObject && this.videoObject.remotePeerId === remotePeerId) {
        openSimpleMessage('', 'The call has been declined');
        this.videoObject.close();
        clearTimeout(this.timer);
        this.enableHeaderBtns();
      }
    });
    this.socket.on('accepted', (remotePeerId) => {
      if (this.videoObject && this.videoObject.remotePeerId === remotePeerId) {
        clearTimeout(this.timer);
        this.videoObject.toggleCallingWindow(false);
      }
    });
    this.socket.on('userOffline', () => {
      openSimpleMessage('', 'User is offline');
      if (this.videoObject) {
        this.videoObject.close();
      }
      if (this.incomingCallObject) {
        this.incomingCallObject.close();
      }
      if (this.timer) {
        clearTimeout(this.timer);
      }
      this.enableHeaderBtns();
    });
    this.socket.on('callEnded', (remotePeerId) => {
      if (this.videoObject && this.videoObject.remotePeerId === remotePeerId) {
        this.videoObject.close();
        openSimpleMessage('', 'Call ended by remote user');
      }
      if (this.incomingCallObject && this.incomingCallObject.remotePeerId === remotePeerId) {
        this.stopAlert();
        this.incomingCallObject.close();
        openSimpleMessage('', 'Call ended by remote user');
      }
      this.enableHeaderBtns();
    });
    this.socket.on('timedOut', (remotePeerId) => {
      if (this.videoObject && this.videoObject.remotePeerId === remotePeerId) {
        this.videoObject.close();
      }
      if (this.incomingCallObject && this.incomingCallObject.remotePeerId === remotePeerId) {
        this.stopAlert();
        this.incomingCallObject.close();
      }
      openSimpleMessage('', 'Missed call');
      this.enableHeaderBtns();
    });
    this.socket.on('message', (message) => {
      console.log(message);
    });
    this.socket.on('getPeerSid', (data) => {
      console.log(data);
    });
    this.socket.on('peerDisconnected', (remotePeerId) => {
      console.log(`${remotePeerId} has disconnected`);
      // Check if the remote user has disconnected, while receiving an incomming call
      if (this.incomingCallObject && this.incomingCallObject.remotePeerId === remotePeerId) {
        this.stopAlert();
        this.changePeerState();
        if (this.timer) {
          clearTimeout(this.timer);
        }
        this.incomingCallObject.close();
      }
    });
    this.socket.on('returnConnectedPeers', (data) => {
      console.log('Connected peers: ');
      console.log(data);
    });
    this.socket.on('userBusy', () => {
      if (this.videoObject) {
        this.videoObject.close();
      }
      if (this.timer) {
        clearTimeout(this.timer);
      }
      openSimpleMessage('', 'User is busy');
      this.enableHeaderBtns();
    });
    // Event below fixes synchronization issues. It is triggered,
    // when local video has started, this insures that our stream
    // will always be passed to the remote peer
    this.webRtc.on('readyToCall', () => {
      var self = this;
      if (this.isCalling === true && this.callData !== null && typeof this.callData !== 'undefined') {
        var name = this.uuid();
        this.webRtc.createRoom(name, (error, roomId) => {
          if (roomId) {
            self.videoObject.roomId = roomId;
          }
          console.log(`Id of the created room is ${roomId}`);
          self.socket.emit('call', { to: self.callData.remotePeerId, createdRoomId: roomId, from: self.currentPeerId, remotePeerName: self.currentPeerName, listingName: self.callData.listingName, avatarHashes: self.avatarHashes });
          var remotePeerId = self.callData.remotePeerId;
          // Set timeout on call, it will be cleared if remote user accepts or declines
          self.timer = setTimeout(() => self.callTimeout(remotePeerId), 60 * 1000);

          self.callData = null;
        });
      }
      else if (this.isCalling === false && this.receivedCallData !== null && typeof this.receivedCallData !== 'undefined') {
        this.webRtc.joinRoom(this.receivedCallData.roomId, (error, roomDescription) => {
          console.log('Joined room with id:');
          console.log(self.receivedCallData.roomId);
          self.acceptCall(self.receivedCallData.remotePeerId);
          self.receivedCallData = null;
        });
      }
      this.isCalling = null;
    });
  }

  callTimeout(remotePeerId) {
    this.socket.emit('timeOut', { to: remotePeerId, from: this.currentPeerId });
    if (this.videoObject) {
      this.videoObject.close();
    }
    openSimpleMessage('', 'No answer');
    this.enableHeaderBtns();
  }

  callPeer(remotePeerId, listingName, remotePeerName, avatarHashes) {
    this.isCalling = true;
    var avatarURL = getAvatarBgImage(avatarHashes);
    this.callData = {
      remotePeerId: remotePeerId,
      listingName: listingName,
      remotePeerName: remotePeerName,
      avatarHashes: avatarHashes,
    };
    this.videoObject = this.createVideoModal(this.webRtc, 'undefined', remotePeerId, remotePeerName, listingName, avatarURL, true);
    this.webRtc.startLocalVideo();
  }

  declineCall(remotePeerId) {
    this.socket.emit('declineCall', { to: remotePeerId, from: this.currentPeerId });
    this.stopAlert();
    if (this.timer) {
      clearTimeout(this.timer);
    }
    this.enableHeaderBtns();
  }

  acceptCall(remotePeerId) {
    this.socket.emit('acceptCall', { to: remotePeerId, from: this.currentPeerId});
    this.stopAlert();
    if (this.timer) {
      clearTimeout(this.timer);
    }
    this.disableHeaderBtnsWhileVideoStreaming();
  }

  transmitAcceptedCall(data) {
    this.isCalling = false;
    this.videoObject = this.createVideoModal(this.webRtc, data.roomId, data.remotePeerId, data.remotePeerName, data.listingName, data.avatarURL);
    this.webRtc.startLocalVideo();
    this.receivedCallData = data;
  }

  endCall(remotePeerId) {
    this.socket.emit('endCall', { to: remotePeerId, from: this.currentPeerId });
    if (this.timer) {
      clearTimeout(this.timer);
    }
    this.enableHeaderBtns();
  }

  changePeerState() {
    this.socket.emit('changeSelfState', { from: this.currentPeerId });
  }

  createVideoModal(webRtcObject, createdRoomId, remotePeerId, remotePeerName, listingName, avatarURL, showCallingWindow) {
    const videoObject = new Video({
      dismissOnEscPress: false,
      showCloseButton: false,
      removeOnClose: true,
      webRtc: webRtcObject,
      roomId: createdRoomId,
      remotePeerId: remotePeerId,
      remotePeerName: remotePeerName,
      listingName: listingName,
      avatarURL: avatarURL,
      showCallingWindow: showCallingWindow
    });

    this.videoModal = videoObject.render().open();
    // Event below will be triggered when modal is closed
    this.videoModal.on('modal-will-remove', () => {
      videoObject.onClosingModal();
      this.enableHeaderBtns();
      this.videoModal = null;
      this.videoObject = null;
    });
    this.disableHeaderBtnsWhileVideoStreaming();
    return videoObject;
  }

  networkProblemMsg() {
    openSimpleMessage('', 'Call ended due to connectivity problem');
  }
  /*
    Helper function, which will be called on two events: 'connectionReady' and 'failed'.
    By doing this we will be sure which user has lost connection to internet, because
    'connectionReady' is triggered on new network connection and 'failed' is
    triggered when ice connection state has changed, in other words when the WebRTC call
    is about to drop.
   */
  iceRestart(failed, connectionReady, message) {
    console.log(`In ice restart function from ${message}`);
    if (!this.RTCFailedSession) {
      this.RTCFailedSession = failed;
    }
    if (!this.connectionReady) {
      this.connectionReady = connectionReady;
    }
    console.log(`Failed: ${this.failed}`);
    console.log(`Connection ready: ${this.connectionReady}`);
    if (!this.RTCFailedSession || !this.connectionReady) {
      return;
    }

    this.RTCFailedSession = null;
    this.connectionReady = null;

    console.log('About to clear fail timer');
    this.videoObject.clearFailTimer();

    console.log('Attempting an icerestart');
    this.videoObject.peer.icerestart(this.videoObject.webrtcSessionId);
    this.videoObject.webrtcSessionId = this.webRtc.sessionId;
  }
  /*
    We should clear variables which are used in ice restart, so we don't have an
    inconsistent state, e.g.:

    Peer A, who has not lost connection to network will call 'iceRestart' function when
    ice connection state is changed to 'failed', because it is triggered on both peers.
    Now RTCFailedSession variable for him is set to true and if A somehow looses connection
    to network and reconnects right away, ice restart will be initiated without waiting for
    the 'failed' event, because now we have both variables - RTCFailedSession and connectionReady
    set to true. This is not right, because an ice restart should be initiated after 'failed' event.

    'clearIceRestartVars' is called when ice connection state is changed to 'connected'
    event is triggered.
   */
  clearIceRestartVars() {
    if (this.RTCFailedSession) {
      this.RTCFailedSession = null;
    }

    if (this.connectionReady) {
      this.connectionReady = null;
    }
  }

  createIncomingCallModal(webRtcObject, createdRoomId, remotePeerId, remotePeerName, listingName, avatarURL) {
    const incomingCallObject = new incomingVideo({
      dismissOnEscPress: false,
      showCloseButton: false,
      removeOnClose: true,
      webRtc: webRtcObject,
      roomId: createdRoomId,
      remotePeerId: remotePeerId,
      remotePeerName: remotePeerName,
      listingName: listingName,
      avatarURL: avatarURL,
    });

    this.incomingCallModal = incomingCallObject.render().open();
    this.incomingCallModal.on('modal-will-remove', () => {
      this.enableHeaderBtns();
      this.incomingCallModal = null;
      this.incomingCallObject = null;
    });
    this.disableHeaderBtnsWhileVideoStreaming();
    return incomingCallObject;
  }
  disableHeaderBtnsWhileVideoStreaming(){
        $('.js-addressBar').prop("disabled", true);
        $('.js-navBack').prop("disabled", true);
        $('.js-navFwd').prop("disabled", true);
        $('.js-navReload').prop("disabled", true);
        $('.js-discover').prop("disabled", true);
        $('.js-navWalletBtn').prop("disabled", true);
        $('.js-navNotifBtn').prop("disabled", true);
        $('#AvatarBtn').prop("disabled", true);
        $('.flexVCent.box.margLSm.posR').addClass('disabled');
        $('.pageNavCenter').addClass('disabled');
        $('.flexVCent.iconPad').addClass('disabled');
  }
  enableHeaderBtns(){
      $('.js-addressBar').prop("disabled", false);
      $('.js-navBack').prop("disabled", false);
      $('.js-navFwd').prop("disabled", false);
      $('.js-navReload').prop("disabled", false);
      $('.js-discover').prop("disabled", false);
      $('.js-navWalletBtn').prop("disabled", false);
      $('.js-navNotifBtn').prop("disabled", false);
      $('#AvatarBtn').prop("disabled", false);
      $('.flexVCent.box.margLSm.posR').removeClass('disabled');
      $('.pageNavCenter').removeClass('disabled');
      $('.flexVCent.iconPad').removeClass('disabled');
  }
}
