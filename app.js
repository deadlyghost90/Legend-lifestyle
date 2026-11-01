let PRODUCTS=[
{id:1,name:"Legend Active One",type:"watch",label:"SMARTWATCH",price:8999,tag:"BESTSELLER",visual:"visual-watch",symbol:""},
{id:2,name:"Legend Air Pods",type:"audio",label:"WIRELESS AUDIO",price:4499,tag:"POPULAR",visual:"visual-earbuds"},
{id:3,name:"Legend Pulse Mini",type:"audio",label:"PORTABLE AUDIO",price:5999,tag:"NEW",visual:"visual-speaker"},
{id:4,name:"Legend Fit Band",type:"watch",label:"FITNESS BAND",price:3499,tag:"EVERYDAY",visual:"visual-band"}
];
const money=n=>"Rs. "+n.toLocaleString("en-PK");
const $=s=>document.querySelector(s);
const productGrid=$("#productGrid"),cart=[],wishlist=new Set();
function productCard(p){return `<article class="product-card"><div class="product-visual"><span class="product-badge">${p.tag}</span><button class="wishlist" data-wish="${p.id}" aria-label="Add ${p.name} to wishlist">${wishlist.has(p.id)?"♥":"♡"}</button><div class="product-object ${p.visual}" aria-hidden="true">${p.symbol||""}</div></div><div class="product-meta"><span class="product-type">${p.label}</span><h3 class="product-title">${p.name}</h3><div class="product-bottom"><span class="product-price">${money(p.price)}</span><button class="add-button" data-add="${p.id}">Add to bag +</button></div></div></article>`}
function matchesQuery(p,q){const term=q.trim().toLowerCase();return !term||[p.name,p.type,p.label,p.tag].some(value=>String(value).toLowerCase().includes(term))}function renderProducts(filter="all",query=""){const list=PRODUCTS.filter(p=>(filter==="all"||p.type===filter)&&matchesQuery(p,query));productGrid.innerHTML=list.length?list.map(productCard).join():'<p>No products found. Try another search.</p>';renderSearch(query)}
function toast(message){const el=$("#toast");el.textContent=message;el.classList.add("show");clearTimeout(toast.timer);toast.timer=setTimeout(()=>el.classList.remove("show"),2300)}
function updateCart(){const count=cart.reduce((n,p)=>n+p.qty,0);$("#cartCount").textContent=count;$("#drawerCount").textContent=count;$("#cartSubtotal").textContent=money(cart.reduce((n,p)=>n+p.price*p.qty,0));$("#cartItems").innerHTML=cart.length?cart.map(p=>`<div class="cart-item"><div class="cart-thumb">${p.type==="watch"?"◉":"◌"}</div><div><strong>${p.name}</strong><small>${money(p.price)} · Qty ${p.qty}</small></div><button class="remove-item" data-remove="${p.id}">Remove</button></div>`).join():'<p class="empty-cart">Your bag is waiting for something good.</p>';$("#checkoutButton").disabled=!cart.length}
function openCart(){closeSearch();$("#cartDrawer").classList.add("open");$("#cartDrawer").setAttribute("aria-hidden","false");$("#overlay").hidden=false;document.body.style.overflow="hidden"}
function closeCart(){ $("#cartDrawer").classList.remove("open");$("#cartDrawer").setAttribute("aria-hidden","true");$("#overlay").hidden=true;document.body.style.overflow=""}
function closeSearch(){$("#searchPanel").hidden=true}
function renderSearch(q){const box=$("#searchResults");if(!q){box.innerHTML="";return}const matches=PRODUCTS.filter(p=>matchesQuery(p,q));box.innerHTML=matches.length?matches.map(p=>`<button data-search-product="${p.id}">${p.name} — ${money(p.price)}</button>`).join():"No matching products found."}
productGrid.addEventListener("click",e=>{const add=e.target.closest("[data-add]");const wish=e.target.closest("[data-wish]");if(add){const p=PRODUCTS.find(x=>x.id===Number(add.dataset.add));const found=cart.find(x=>x.id===p.id);found?found.qty++:cart.push({...p,qty:1});updateCart();toast(p.name+" added to your bag.");}if(wish){const id=Number(wish.dataset.wish);wishlist.has(id)?wishlist.delete(id):wishlist.add(id);renderProducts(document.querySelector(".filter-chip.active").dataset.filter);toast(wishlist.has(id)?"Added to wishlist.":"Removed from wishlist.");}});
$("#cartItems").addEventListener("click",e=>{const b=e.target.closest("[data-remove]");if(!b)return;const i=cart.findIndex(p=>p.id===Number(b.dataset.remove));if(i>=0)cart.splice(i,1);updateCart()});
$("#cartToggle").addEventListener("click",openCart);$("#cartClose").addEventListener("click",closeCart);$("#overlay").addEventListener("click",closeCart);
$("#checkoutButton").addEventListener("click",()=>toast("Checkout is a demo. Connect a secure payment provider before accepting orders."));
document.querySelectorAll(".filter-chip").forEach(b=>b.addEventListener("click",()=>{document.querySelectorAll(".filter-chip").forEach(x=>x.classList.toggle("active",x===b));renderProducts(b.dataset.filter)}));
$("#searchToggle").addEventListener("click",()=>{$("#searchPanel").hidden=false;$("#searchInput").focus()});$("#searchClose").addEventListener("click",closeSearch);
$("#searchInput").addEventListener("input",e=>{const q=e.target.value;const active=document.querySelector(".filter-chip.active");renderProducts(active?active.dataset.filter:"all",q);});
$("#searchResults").addEventListener("click",e=>{const b=e.target.closest("[data-search-product]");if(!b)return;const p=PRODUCTS.find(x=>x.id===Number(b.dataset.searchProduct));closeSearch();document.querySelector("#featured").scrollIntoView({behavior:"smooth"});toast(p.name+" — "+money(p.price))});
$("#menuToggle").addEventListener("click",()=>{const nav=$("#mainNav"),open=nav.classList.toggle("open");$("#menuToggle").setAttribute("aria-expanded",String(open))});
$("#mainNav").addEventListener("click",e=>{if(e.target.closest("a")){$("#mainNav").classList.remove("open");$("#menuToggle").setAttribute("aria-expanded","false")}});
$("#newsletterForm").addEventListener("submit",e=>{e.preventDefault();$("#newsletterMessage").textContent="Thanks for your interest. Newsletter signup needs a connected mailing service.";e.target.reset()});
document.addEventListener("keydown",e=>{if(e.key==="Escape"){closeCart();closeSearch();$("#mainNav").classList.remove("open")}});
$("#year").textContent=new Date().getFullYear();renderProducts();updateCart();
// Live catalogue: Firebase public node contains active products only. Demo products are used only when no Firebase config is present.
(async function loadFirebaseCatalogue(){
  const config=window.LEGEND_FIREBASE_CONFIG||{};
  if(!config.apiKey||!config.databaseURL||!config.projectId)return;
  try{
    const appSdk=await import("https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js");
    const dbSdk=await import("https://www.gstatic.com/firebasejs/11.10.0/firebase-database.js");
    const app=appSdk.getApps().length?appSdk.getApp():appSdk.initializeApp(config);
    const db=dbSdk.getDatabase(app);
    const snapshot=await dbSdk.get(dbSdk.ref(db,"storefrontProducts"));
    if(!snapshot.exists()){PRODUCTS=[];renderProducts();updateCart();return;}
    const live=Object.entries(snapshot.val()).map(([id,p])=>({
      id, name:String(p.name||"Product"), type:/audio|earbud|speaker|headphone/i.test(String(p.category||""))?"audio":/watch|wearable|band/i.test(String(p.category||""))?"watch":"accessories",
      label:String(p.category||"ACCESSORIES").toUpperCase(), price:Number(p.price_pkr)||0, tag:"LEGEND",
      visual:/audio|earbud|speaker|headphone/i.test(String(p.category||""))?"visual-earbuds":/watch|wearable|band/i.test(String(p.category||""))?"visual-watch":"visual-band", symbol:"", description:String(p.description||"")
    })).filter(p=>p.price>0);
    PRODUCTS=live;renderProducts();updateCart();
  }catch(error){PRODUCTS=[];renderProducts();updateCart();console.warn("Firebase catalogue unavailable; live products hidden until the connection is fixed.",error&&error.name||"Error");}
})();