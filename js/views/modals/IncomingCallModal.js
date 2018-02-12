import loadTemplate from '../../utils/loadTemplate';
import BaseModal from './BaseModal';
import app from '../../app';

export default class extends BaseModal {
  constructor(options = {}) {
    super(options);
    this.webRtc = options.webRtc;
    this.roomId = options.roomId;
    this.remotePeerId = options.remotePeerId;
    this.remotePeerName = options.remotePeerName;
    this.listingName = options.listingName;
    this.avatarURL = options.avatarURL;
    this.options = options;
  }

  className() {
    return `${super.className()} incomingCall modalScrollPage`;
  }

  events() {
    return {
    'click .accept': 'handleAcceptBtnClick',
    'click .decline': 'handleDeclineBtnClick',
      ...super.events(),
    };
  }

  handleAcceptBtnClick() {
    app.io.transmitAcceptedCall(this.options);
    this.close();
  }

  handleDeclineBtnClick() {
    app.io.declineCall(this.remotePeerId);
    this.close();
  }

  remove() {
    super.remove();
  }

  render() {
    loadTemplate('modals/video/incomingCallModal.html', t => {
      this.$el.html(t({
          avatarURL: this.avatarURL,
          remotePeerName: this.remotePeerName,
          listingName: this.listingName,
      }));
    });

    super.render();

    return this;
  }
}
