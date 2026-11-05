/* Inicio PWA PDF Fer. La app también funciona como web convencional. */
(() => {
  'use strict';
  function start(){
    const net=document.getElementById('fer-network');
    const editor=document.getElementById('fer-editor-shortcut');
    const merge=document.getElementById('fer-merge-shortcut');
    const install=document.getElementById('fer-install');
    function status(){if(!net)return;const offline=!navigator.onLine;net.textContent=offline?'Sin conexión · modo local':'Conectado · modo local';net.classList.toggle('offline',offline);net.title=offline?'Las funciones cuyas bibliotecas ya se descargaron pueden seguir funcionando.':'Tus documentos se procesan en el dispositivo.';}
    status();window.addEventListener('online',status);window.addEventListener('offline',status);
    editor?.addEventListener('click',()=>{document.querySelector('[data-tool="edit"]')?.click()});
    merge?.addEventListener('click',()=>{document.querySelector('[data-tool="merge"]')?.click()});
    let prompt=null;
    window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();prompt=e;install.hidden=false;});
    install?.addEventListener('click',async()=>{if(!prompt)return;prompt.prompt();await prompt.userChoice;prompt=null;install.hidden=true;});
    window.addEventListener('appinstalled',()=>{install.hidden=true;prompt=null;});
    if('serviceWorker' in navigator && location.protocol==='https:'){
      window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js',{scope:'./'}).catch(err=>console.warn('PDF Fer: sin modo offline:',err)));
    }
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
})();
