import baseVw from '../baseVw';
import loadTemplate from '../../utils/loadTemplate';

export default class extends baseVw {
  constructor(options = {}) {
    super(options);

    this.msg = options.messageData.msg;
    this.from = options.messageData.from;
    this.isMine = options.messageData.isMine;
  }

  getTime() {
    var date = new Date();
    var hours = date.getHours();
    var minutes = date.getMinutes();
    var suffix = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12;
    minutes = minutes < 10 ? `0${minutes}` : minutes;

    return `${hours}:${minutes} ${suffix}`;
  }

  render() {
    this.timestamp = this.getTime();

    loadTemplate('chat/videoChatMsg.html', (t) => {
      this.$el.html(t({
        msg: this.msg,
        sender: this.from,
        timestamp: this.timestamp,
        isMine: this.isMine,
      }));
    });

    return this;
  }
}
