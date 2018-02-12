import $ from 'jquery';
import { ipcRenderer } from 'electron';
import app from '../app';
import Dialog from '../views/modals/Dialog';

let statusMsg;
let removeStatusMsgTimout;

export function showUpdateStatus(status = '', type = 'message') {
  return "";
}

let updateReadyDialog;

export function updateReady(opts = {}) {
  
}
