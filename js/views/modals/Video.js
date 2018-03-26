import loadTemplate from '../../utils/loadTemplate';
import BaseModal from './BaseModal';
import app from '../../app';

export default class extends BaseModal {
  constructor(options = {}) {
    super(options);
    this.webRTC = options.webRtc;
    this.roomId = options.roomId;
    this.remotePeerId = options.remotePeerId;
    this.remotePeerName = options.remotePeerName;
    this.listingName = options.listingName;
    this.avatarURL = options.avatarURL;
    this.showCallingWindow = options.showCallingWindow;
    this.options = options;
    this.attachWebRTCEvents();
    this.isFullscreen = false;
    this.animationControlsTimeout = null;
    this.webrtcSessionId = this.webRTC.sessionId;
    this.failTimer = null;
  }

  // Attach WebRTC events
  attachWebRTCEvents() {
    this.webRTC.on('videoAdded', (video, peer) => {
      this.peer = peer;
      if (peer && peer.pc) {
        peer.pc.on('iceConnectionStateChange', (event) => {
          switch (peer.pc.iceConnectionState) {
            case 'checking':
              console.log('checking state');
              break;
            case 'connected':
              console.log('connected state');
              this.toggleLoadingWindow(false);
              this.clearFailTimer();
            case 'completed': // on caller side
              console.log('completed state');
              break;
            case 'disconnected':
              console.log('disconnected state');
              this.toggleLoadingWindow(true);
              break;
            case 'failed':
              console.log('failed state');
              this.failTimer = setTimeout(() => {
                this.close();
                app.io.networkProblemMsg();
              }, 30 * 1000);
              break;
            case 'closed':
              console.log('closed state');
              break;
          }
        });
      }
      console.log(this.webRTC.webrtc.peers);
      console.log('video added');
      this.video = video;
      this.peer = peer;
      this.id = peer.id;
      // Append the remote stream to its container
      this.$el.find('#remoteContainer').append(video);
      var self = this;
      setTimeout(function(){
          self.$el.find('.videoContainer__body').removeClass('display');
          self.$el.find('.videoContainer__body').addClass('display');
          self.$el.find('.videoContainer__spinner').removeClass('display');
      }, 1000);
      window.callDurationNumber = 0;
      window.centPerMinuteNumber = 0;
      window.callDurationInterval = setInterval(function() {
            window.callDurationNumber++;
            var hours   = Math.floor(window.callDurationNumber / 3600);
            var minutes = Math.floor((window.callDurationNumber - (hours * 3600)) / 60);
            var seconds = window.callDurationNumber - (hours * 3600) - (minutes * 60);
            if(hours === 0){
                hours = '';
            }else if (hours < 10){
                hours = '0' + hours + ':';
            }else {
                hours += ':'
            }

            minutes < 10 ? minutes = '0' + minutes: minutes;
            seconds < 10 ? seconds = '0' + seconds: seconds;
            $('.durationDisplay__number').text(hours + minutes + ':' + seconds);

            window.centPerMinuteNumber++;
            var dollars = Math.floor(window.centPerMinuteNumber/100);
            var cents = window.centPerMinuteNumber - (dollars*100);
            cents < 10 ? cents = '0' + cents : cents;
            $('.centPerMinute__value').text(dollars + '.' + cents);
        }, 1000);
    });

    this.webRTC.on('createdPeer', (peer) => {

      // Next loop takes care of not adding the same peer in current peers array. It happens
      // because WebRTC object is never disconnected or reinitialised.
      this.webRTC.webrtc.peers.forEach((currentPeer, index, array) => {
        if (peer.id === currentPeer.id && array.length !== 1) {
          array.splice(index, 1);
          return;
        }
      });
      console.log('peer added');
      console.log(peer);
    });

    this.webRTC.on('videoRemoved', (video, peer) => {
      console.log('Remote video removed (remote peer disconnected)');
      app.io.changePeerState();
      this.close();
    });
  }

  detachWebRTCEvents() {
    this.webRTC.off('videoAdded');
    this.webRTC.off('createdPeer');
    this.webRTC.off('videoRemoved');
  }

  className() {
    return `${super.className()} videoConnection modalScrollPage`;
  }

  events() {
    return {
      'click .js-mute': 'handleMuteBtnClick',
      'click .js-pause': 'handlePauseBtnClick',
      'click .js-end': 'handleEndBtnClick',
//      'mouseenter .contentBox': 'handleDisplayVideoControls',
//      'mouseleave .contentBox': 'handleHideVideoControls',
      ...super.events(),
    };
  }

    handleDisplayVideoControls(that){
        that.$el.find('.btnContainer').removeClass('display');
        that.$el.find('.btnContainer').addClass('display');
    }
    handleHideVideoControls(that){
        that.$el.find('.btnContainer').removeClass('display');
    }

  attachHandleFullScreen(){
      var self = this;
      self.$el.find('.js-fullScreen').click(function(){
          self.handleFullScreenBtnClick(self)
      });
      $(document).keydown(function(e) {
         if (self.isFullscreen && e.keyCode == 27) {
            self.handleCancelFullScreenBtnClick(self);
        }
    });
  }

  handleFullScreenBtnClick(self) {
    const fullScreenVideo = self.$el.find('.videoContainer')[0];
    var fullscreenButton = self.$el.find('.js-fullScreen');
    var remoteVideo = self.$el.find('#remoteContainer')[0];
    if (fullScreenVideo && fullScreenVideo.webkitRequestFullscreen) {
      fullScreenVideo.webkitRequestFullscreen();
      self.isFullscreen = true;
      self.toggleControlsInFullscreenMode(self);
      $('.videoContainer').css('height','100vh');
      $('.videoContainer').css('width','100vw');
      $('#remoteContainer video').css('height','100vh');
      $('#remoteContainer video').css('width','100vw');
      fullscreenButton.off();
      fullscreenButton.attr('title', 'Exit fullScreen');
      fullscreenButton.html('<i class="fa fa-expand" aria-hidden="true"></i>');
      fullscreenButton.click(function(){self.handleCancelFullScreenBtnClick(self)});
    }
  }

  handleCancelFullScreenBtnClick(self){
      const fullScreenVideo = self.$el.find('.videoContainer');
      var fullscreenButton = self.$el.find('.js-fullScreen');
      if (fullScreenVideo && document.webkitExitFullscreen) {
        document.webkitExitFullscreen();
        self.isFullscreen = false;
        self.$el.find(".contentBox").off('mousemove');
        clearTimeout(self.animationControlsTimeout);
        $('.videoContainer').css('height','480px');
        $('.videoContainer').css('width','640px');
        $('#remoteContainer video').css('height','480px');
        $('#remoteContainer video').css('width','640px');
        fullscreenButton.off();
        fullscreenButton.attr('title', 'FullScreen');
        fullscreenButton.html('<i class="fa fa-arrows-alt" aria-hidden="true"></i>');
        fullscreenButton.click(function(){self.handleFullScreenBtnClick(self)});
      }
  }

    toggleControlsInFullscreenMode(self){
        self.animationControlsTimeout = null;
        self.$el.find(".contentBox").off('mousemove');
        self.$el.find(".contentBox").on('mousemove', function() {
            clearTimeout(self.animationControlsTimeout);
            self.handleDisplayVideoControls(self);
            self.animationControlsTimeout = setTimeout(function () {
                self.handleHideVideoControls(self);
            }, 2000);
        });
    }

  // Mutes/Unmutes local video audio
  handleMuteBtnClick() {
    const element = this.$el.find('.js-mute');
    if (element.hasClass('muted')) {
      this.webRTC.unmute();
      element.removeClass('muted');
      element.attr('title', 'Mute');
      element.html('<i class="fa fa-microphone" aria-hidden="true"></i>');
    }
    else {
      this.webRTC.mute();
      element.addClass('muted');
      element.attr('title', 'Unmute');
      element.html('<i class="fa fa-microphone-slash" aria-hidden="true"></i>');
    }
  }
  // Pauses/Unpauses local video streaming
  handlePauseBtnClick() {
    const element = this.$el.find('.js-pause');
    const localVideoContainerEl = this.$el.find('#localVideoContainer');
    if (element.hasClass('paused')) {
      this.webRTC.resumeVideo();
      element.removeClass('paused');
      localVideoContainerEl.removeClass('display');
      localVideoContainerEl.addClass('display');
      element.attr('title', 'Pause video');
      element.html('<i class="fa fa-video-camera" aria-hidden="true">');
    }
    else {
      this.webRTC.pauseVideo();
      element.addClass('paused');
      localVideoContainerEl.removeClass('display');
      element.attr('title', 'Resume video');
      element.html('<i class="fa fa-pause" aria-hidden="true"></i>');
    }
  }

  handleEndBtnClick() {
    app.io.endCall(this.remotePeerId);
    this.close();
  }

  onClosingModal() {
    clearInterval(window.callDurationInterval);
    window.callDurationNumber = 0;
    window.centPerMinuteNumber = 0;
    if (this.webRTC) {
      this.webRTC.stopLocalVideo();
      this.webRTC.leaveRoom();
      this.detachWebRTCEvents();
    }
  }

  createRoom(callback) {
    if (callback) {
      this.webRTC.startLocalVideo();
      this.webRTC.createRoom('', callback);
    }
    else {
      this.webRTC.startLocalVideo();
      this.webRTC.createRoom('', (error, roomId) => {
        console.log('Room is created with id:');
        console.log(roomId);
      });
    }
  }

  joinRoom(roomId) {
    this.webRTC.startLocalVideo();
    this.webRTC.joinRoom(roomId, (error, roomDescription) => {
      console.log('Joined room with id:');
      console.log(roomId);
      app.io.acceptCall(this.remotePeerId);
    });
  }

  remove() {
    super.remove();
  }

  attachVisualizeVideoControlEvents (){
      var containerSelector = this.$el.find('.contentBox');
      containerSelector.off();
      var self = this;
      containerSelector.mouseenter(function(){
         self.handleDisplayVideoControls(self);
      });
      containerSelector.mouseleave(
          function(){
             self.handleHideVideoControls(self);
          });
  }

  disattachVisualizeVideoControlEvents(){
      var containerSelector = this.$el.find('.contentBox');
      containerSelector.off();
  }

  toggleCallingWindow (flag){
      var callDetailsSelector = this.$el.find('.btnContainer.top .nickname, .btnContainer.top .durationDisplay__text, .btnContainer.top .centPerMinute__container');
      var callingStringSelector = this.$el.find('.btnContainer.top .callingString');
      var callingProfileSelector = this.$el.find('.callingScreen');
      if(flag){
            callDetailsSelector.removeClass('hide');
            callDetailsSelector.addClass('hide');
            callingStringSelector.removeClass('hide');
            callingProfileSelector.removeClass('hide');
            this.disattachVisualizeVideoControlEvents();
            this.$el.find('.js-fullScreen').prop("disabled", true);
      }else {
          callDetailsSelector.removeClass('hide');
          callingStringSelector.removeClass('hide');
          callingStringSelector.addClass('hide');
          callingProfileSelector.removeClass('hide');
          callingProfileSelector.addClass('hide');
          this.attachVisualizeVideoControlEvents();
          this.$el.find('.js-fullScreen').prop("disabled", false);
      }
  };

  clearFailTimer() {
    console.log('Clearing fail timer');
    if (this.failTimer) {
      clearTimeout(this.failTimer);
      this.failTimer = null;
    }
  }

/**
*This method shows/hides the "Loading Window" - when the call is reconnecting
* flag - if it is true the loading window is displayed
         if it is false the loading window is hidden
*/
  toggleLoadingWindow(flag){
      this.$el.find('.loadingScreen').removeClass('hide');
      if(!flag){
          this.$el.find('.loadingScreen').addClass('hide');
      }
  }

  render() {
    loadTemplate('modals/video/video.html', t => {
      this.$el.html(t({
          avatarURL: this.avatarURL,
          remotePeerName: this.remotePeerName
      }));
    });

    super.render();

    this.attachHandleFullScreen();

    this.toggleCallingWindow(this.showCallingWindow);

    return this;
  }
}
