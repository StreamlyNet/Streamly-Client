import SimpleWebRTC from 'simplewebrtc';

export function instantiateWebRtcObject(signallingServerUrl) {
  const webRTC = new SimpleWebRTC({
    url: signallingServerUrl,
    localVideoEl: 'localVideo',
    remoteVideosEl: 'remoteVideo',
    autoRequestMedia: false,
    detectSpeakingEvents: true,
    socketio: {
      forceNew: true,
    },
  });

  webRTC.on('connectionReady', (sessionId) => {
    console.log('Connection ready');
    console.log(sessionId);
  });

  webRTC.on('readyToCall', () => {
  });

  return webRTC;
}

