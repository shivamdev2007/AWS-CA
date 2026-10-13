(() => {
  const $ = (s) => document.querySelector(s);
  const conversation = $("#conversation"), messagesEl = $("#messages"), welcome = $("#welcome");
  const input = $("#messageInput"), sendBtn = $("#sendBtn"), chatList = $("#chatList");
  const STORE_KEY = "chat-studio-conversations-v1";
  let chats = loadChats(), activeId = chats[0]?.id || null, busy = false, toastTimer;

  function uid(){ return Date.now().toString(36) + Math.random().toString(36).slice(2,7); }
  function loadChats(){ try { const data = JSON.parse(localStorage.getItem(STORE_KEY) || "[]"); return Array.isArray(data) ? data : []; } catch { return []; } }
  function save(){ localStorage.setItem(STORE_KEY, JSON.stringify(chats)); }
  function activeChat(){ return chats.find(c => c.id === activeId); }
  function newChat(focus=true){
    const chat = {id:uid(), title:"New chat", messages:[], updated:Date.now()};
    chats.unshift(chat); activeId=chat.id; save(); renderChatList(); renderMessages();
    if(focus) input.focus();
    closeSidebar(); return chat;
  }
  function ensureChat(){ return activeChat() || newChat(false); }
  function renderChatList(){
    chatList.innerHTML="";
    chats.slice().sort((a,b)=>b.updated-a.updated).forEach(chat=>{
      const item=document.createElement("div"); item.className="chat-item"+(chat.id===activeId?" active":"");
      const title=document.createElement("span"); title.className="chat-title"; title.textContent=chat.title || "New chat"; title.title=title.textContent;
      const del=document.createElement("button"); del.className="delete-chat"; del.type="button"; del.textContent="×"; del.title="Delete conversation"; del.setAttribute("aria-label","Delete "+title.textContent);
      item.append(title,del);
      item.addEventListener("click",()=>{activeId=chat.id;renderChatList();renderMessages();closeSidebar();});
      del.addEventListener("click",e=>{e.stopPropagation();chats=chats.filter(c=>c.id!==chat.id);if(activeId===chat.id)activeId=chats[0]?.id||null;save();renderChatList();renderMessages();});
      chatList.append(item);
    });
  }
  function renderMessages(){
    messagesEl.innerHTML=""; const chat=activeChat(); const msgs=chat?.messages||[];
    welcome.classList.toggle("hidden",msgs.length>0);
    msgs.forEach((m,i)=>appendMessage(m.role,m.content,false,i));
    scrollBottom();
  }
  function escapeHTML(s){return s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
  // Small Markdown renderer: escaped HTML, fenced code, inline code, bold and simple lists.
  function markdown(src){
    const blocks=[];
    let safe=src.replace(/```([\w+-]*)\n?([\s\S]*?)```/g,(_,lang,code)=>{blocks.push(`<pre><code>${escapeHTML(code.trim())}</code></pre>`);return `@@BLOCK${blocks.length-1}@@`;});
    safe=escapeHTML(safe);
    safe=safe.replace(/`([^`\n]+)`/g,'<code>$1</code>').replace(/\*\*([^*]+)\*\*/g,'<strong>$1</strong>').replace(/\*([^*\n]+)\*/g,'<em>$1</em>');
    const lines=safe.split("\n"); let out="", inList=false;
    for(const line of lines){
      const match=line.match(/^\s*[-*]\s+(.+)/);
      if(match){if(!inList){out+="<ul>";inList=true;}out+=`<li>${match[1]}</li>`;}
      else{if(inList){out+="</ul>";inList=false;}out+=line.trim()?`<p>${line}</p>`:"";}
    }
    if(inList)out+="</ul>";
    return out.replace(/@@BLOCK(\d+)@@/g,(_,i)=>blocks[Number(i)]);
  }
  function appendMessage(role,content,animate=true,index=-1){
    const wrap=document.createElement("article");wrap.className="message "+(role==="user"?"user":"assistant");
    const avatar=document.createElement("div");avatar.className="message-avatar";avatar.textContent=role==="user"?"S":"✳";
    const inner=document.createElement("div");inner.className="message-content";inner.innerHTML=markdown(content);
    wrap.append(avatar,inner);
    if(role!=="user"){
      const actions=document.createElement("div");actions.className="message-actions";
      const copy=document.createElement("button");copy.textContent="Copy";copy.type="button";copy.addEventListener("click",async()=>{try{await navigator.clipboard.writeText(content);showToast("Copied to clipboard");}catch{showToast("Could not access clipboard");}});
      actions.append(copy);inner.append(actions);
    }
    messagesEl.append(wrap); if(animate)scrollBottom(); return wrap;
  }
  function scrollBottom(){requestAnimationFrame(()=>conversation.scrollTop=conversation.scrollHeight);}
  function showToast(text){const el=$("#toast");el.textContent=text;el.classList.add("show");clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove("show"),2300);}
  function setBusy(v){busy=v;sendBtn.disabled=v||!input.value.trim();input.disabled=v;sendBtn.textContent=v?"…":"↑";}
  function updateTitle(chat,firstText){if(chat.messages.filter(m=>m.role==="user").length===1){chat.title=firstText.trim().replace(/\s+/g," ").slice(0,35)||"New chat";}}
  async function sendMessage(text){
    text=text.trim(); if(!text||busy)return;
    const chat=ensureChat(); chat.messages.push({role:"user",content:text});chat.updated=Date.now();updateTitle(chat,text);save();
    welcome.classList.add("hidden");appendMessage("user",text);input.value="";resizeInput();setBusy(true);renderChatList();
    const typing=appendMessage("assistant","",true);typing.querySelector(".message-content").innerHTML='<div class="typing"><span></span><span></span><span></span></div>';
    try{
      let answer;
      if($("#realAiToggle").checked){
        const response=await fetch("http://localhost:3000/api/chat",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({messages:chat.messages.slice(-20)})});
        const data=await response.json();if(!response.ok)throw new Error(data.error||"Backend request failed");answer=data.reply;
      }else{await new Promise(r=>setTimeout(r,450+Math.random()*450));answer=demoReply(text);}
      typing.remove();chat.messages.push({role:"assistant",content:answer});chat.updated=Date.now();save();appendMessage("assistant",answer);renderChatList();
    }catch(err){
      typing.remove();const msg="I couldn't get a response. "+(err.message||"Check your connection.");
      appendMessage("assistant",msg);showToast("Could not get AI response");
    }finally{setBusy(false);input.focus();scrollBottom();}
  }
  function demoReply(text){
    const t=text.toLowerCase();
    if(/\b(hi|hello|hey|namaste)\b/.test(t))return "Hey! 👋 I'm your Chat Studio demo assistant. Ask me something, or enable **Use real AI** in Settings after starting the backend.";
    if(/\b(html|css|javascript|js|code|program|bug|error)\b/.test(t))return "I can help you work through that. In demo mode, I don't run a real AI model, so my answers are limited.\n\n**To get real AI responses:**\n- Start the Node.js backend included with this project.\n- Add your AI provider API key to the backend `.env` file.\n- Turn on **Use real AI** in Settings.\n\nThen send your question again.";
    if(/\b(plan|study|schedule)\b/.test(t))return "Here's a simple starting plan:\n\n- **Choose one outcome:** define what you want to finish.\n- **Break it down:** list 2–4 small tasks.\n- **Work in focused blocks:** try 25 minutes of work and a 5-minute break.\n- **Review:** check what worked and adjust tomorrow.\n\nThis is a demo response, not a real AI-generated answer.";
    return "Thanks for your message! This interface is working, but **demo mode doesn't use a real AI model**. Open Settings, enable **Use real AI**, and start the included backend with an API key to get genuine AI-generated replies.";
  }
  function resizeInput(){input.style.height="auto";input.style.height=Math.min(input.scrollHeight,180)+"px";sendBtn.disabled=busy||!input.value.trim();}
  function closeSidebar(){$("#sidebar").classList.remove("open");}
  $("#newChat").addEventListener("click",()=>newChat());
  $("#chatForm").addEventListener("submit",e=>{e.preventDefault();sendMessage(input.value);});
  input.addEventListener("input",resizeInput);
  input.addEventListener("keydown",e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();if(!busy)sendMessage(input.value);}});
  $("#openSidebar").addEventListener("click",()=>$("#sidebar").classList.add("open"));
  $("#closeSidebar").addEventListener("click",closeSidebar);
  $("#clearChat").addEventListener("click",()=>{const chat=activeChat();if(!chat||!chat.messages.length){showToast("This chat is already empty");return;}chat.messages=[];chat.title="New chat";chat.updated=Date.now();save();renderChatList();renderMessages();showToast("Chat cleared");});
  $("#themeBtn").addEventListener("click",()=>{document.body.classList.toggle("light");localStorage.setItem("chat-studio-light",document.body.classList.contains("light"));});
  if(localStorage.getItem("chat-studio-light")==="true")document.body.classList.add("light");
  document.querySelectorAll(".suggestion").forEach(btn=>btn.addEventListener("click",()=>{input.value=btn.dataset.prompt;resizeInput();sendMessage(input.value);}));
  $("#settingsBtn").addEventListener("click",()=>$("#settingsModal").classList.remove("hidden"));
  $("#closeSettings").addEventListener("click",()=>$("#settingsModal").classList.add("hidden"));
  $("#doneSettings").addEventListener("click",()=>{$("#settingsModal").classList.add("hidden");showToast($("#realAiToggle").checked?"Real AI mode selected":"Demo mode selected");});
  $("#realAiToggle").addEventListener("change",()=>{$("#connectionNote").textContent=$("#realAiToggle").checked?"Real AI mode sends messages to http://localhost:3000. Start the backend and configure your API key first.":"Demo mode is active. Replies are generated locally and do not come from a real AI model.";});
  $("#exportChats").addEventListener("click",()=>{const blob=new Blob([JSON.stringify(chats,null,2)],{type:"application/json"});const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download="chat-studio-conversations.json";a.click();URL.revokeObjectURL(url);showToast("Chat export downloaded");});
  document.addEventListener("keydown",e=>{if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==="k"){e.preventDefault();newChat();}if(e.key==="Escape"){$("#settingsModal").classList.add("hidden");closeSidebar();}});
  if(!chats.length)newChat(false);else{renderChatList();renderMessages();}
})();
