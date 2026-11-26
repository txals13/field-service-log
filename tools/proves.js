/* THE TESTS OF THE MERGE BETWEEN DEVICES (2026-11-26).

   Run by tools/proves.py, which loads a copy of index.html with a hook into
   the app's own scope (window.__fsl) and this file after it. Nothing here is
   part of the app and the copy is never published.

   What is tested is what loses somebody's work if it breaks, and what nobody
   can check by looking at a screen: two copies of one visit made one
   (mergeSessionLists > visitMerge), how a change is noted down in the first
   place (stampChanged), the expenses, the deletion notes, the history file
   and the list of users. Every test builds its own made-up visits: no client,
   no machine, no person is real.

   The app's clock is replaced while this runs (`now`), so every stamp is a
   known minute: at(10) is ten minutes after the start. The app never edits a
   visit in place — it replaces the object — and the tests do the same, since
   that is exactly what stampChanged looks at. */
(function(){
  "use strict";
  var R=[],group="";
  function done(extra){window.__proves=Object.assign({done:true,results:R},extra||{})}
  if(typeof window.__fsl!=="function"){done({fatal:"the hook into the app is missing"});return}
  var app=window.__fsl;

  // ── a tiny test bench ──
  function grup(n){group=n}
  function prova(name,fn){
    try{fn();R.push({g:group,n:name,ok:true})}
    catch(e){R.push({g:group,n:name,ok:false,m:String((e&&e.message)||e)})}
  }
  function canon(x){   // the same content gives the same text, whatever order the keys came in
    if(Array.isArray(x))return x.map(canon);
    if(x&&typeof x==="object"){var o={};Object.keys(x).sort().forEach(function(k){o[k]=canon(x[k])});return o}
    return x;
  }
  function txt(x){return JSON.stringify(canon(x))}
  function igual(got,want,what){if(txt(got)!==txt(want))throw new Error((what?what+": ":"")+"esperat "+txt(want)+", ha sortit "+txt(got))}
  function cert(v,what){if(!v)throw new Error(what||"havia de ser cert")}
  function clone(x){return JSON.parse(JSON.stringify(x))}   // what a trip through Drive does to a visit

  // ── the app's functions, and its clock ──
  var F={};
  ["mergeSessionLists","visitMerge","exMergeVisit","goneBlocks","histMerge","usrMerge","markSeen","stampChanged","sStamp"]
    .forEach(function(n){F[n]=app(n)});
  var T0=Date.UTC(2026,0,10,8,0,0),minute=0;
  function at(m){return new Date(T0+m*60000).toISOString()}
  window.__clock=function(){return at(minute)};
  var realNow=app("now");
  app("now=function(){return window.__clock()}");
  function setS(l){window.__s=l;app("sessions=window.__s")}
  function getS(){return app("sessions")}

  // ── made-up data ──
  function ent(id,m,text,extra){return Object.assign({id:id,ts:at(m),text:text||id,severity:"info"},extra||{})}
  function visit(extra){
    return Object.assign({id:"v1",client:"Client de prova",machine:"Màquina de prova",status:"open",
      createdAt:at(0),updatedAt:at(0),notes:"",entries:[ent("e1",0,"primera")]},extra||{});
  }
  // What one device does to a visit at minute `m`: it holds its own copy, puts
  // a NEW object in its place, and saves — which is when the change is stamped.
  function change(v,m,fn){
    var mine=clone(v);
    setS([mine]);F.markSeen();
    var next=fn(mine);
    minute=m;setS([next]);F.stampChanged();
    return getS()[0];
  }
  function withEntry(e,m){return function(v){return Object.assign({},v,{entries:v.entries.concat([e]),updatedAt:at(m)})}}
  function withField(k,val,m,quiet){return function(v){var o=Object.assign({},v);o[k]=val;if(!quiet)o.updatedAt=at(m);return o}}
  // Two copies meet at minute 1000, well after everything else.
  function merge(a,b){minute=1000;return F.mergeSessionLists([clone(a)],[clone(b)])[0]}
  function ids(v){return (v.entries||[]).map(function(e){return e.id})}
  function content(v){var o=clone(v);delete o.modAt;delete o.updatedAt;return o}

  try{
    // ─────────────────────────────────────────────────────────────────────
    grup("Com s'apunta un canvi");
    prova("una entrada nova queda marcada amb l'hora, i les que ja hi eren no",function(){
      var a=change(visit(),10,withEntry(ent("e2",5),10));
      igual(a.entries.filter(function(e){return e.id==="e2"})[0].mAt,at(10),"mAt de la nova");
      cert(!a.entries.filter(function(e){return e.id==="e1"})[0].mAt,"l'entrada vella no ha de rebre marca");
      igual(a.modAt,at(10),"modAt de la visita");
    });
    prova("treure una entrada deixa una marca d'esborrat",function(){
      var v=visit({entries:[ent("e1",0),ent("e2",1)]});
      var a=change(v,10,function(x){return Object.assign({},x,{entries:x.entries.filter(function(e){return e.id!=="e2"}),updatedAt:at(10)})});
      igual(a.entGone,[{id:"e2",at:at(10)}]);
    });
    prova("un camp canviat queda apuntat amb l'hora, i els altres no",function(){
      var a=change(visit(),10,withField("notes","hola",10));
      igual(a.fAt,{notes:at(10)});
    });
    prova("el que arriba de Drive no compta com un canvi d'aquest aparell",function(){
      var v=clone(visit());
      setS([v]);F.markSeen();minute=10;F.stampChanged();
      cert(!getS()[0].modAt,"no ha de quedar marcada com a canviada");
    });

    // ─────────────────────────────────────────────────────────────────────
    grup("Dues còpies d'una visita");
    prova("una visita que només té un aparell es conserva",function(){
      var l=F.mergeSessionLists([visit({id:"v1"})],[visit({id:"v2"})]);
      igual(l.map(function(x){return x.id}).sort(),["v1","v2"]);
    });
    prova("dues persones afegeixen una entrada cadascuna: es conserven totes dues",function(){
      var base=visit(),a=change(base,10,withEntry(ent("eA",5),10)),b=change(base,20,withEntry(ent("eB",7),20));
      igual(ids(merge(a,b)),["e1","eA","eB"],"A amb B");
      igual(ids(merge(b,a)),["e1","eA","eB"],"B amb A");
    });
    prova("les entrades queden per ordre d'hora després de fusionar",function(){
      var base=visit(),a=change(base,10,withEntry(ent("tard",50),10)),b=change(base,20,withEntry(ent("aviat",3),20));
      igual(ids(merge(a,b)),["e1","aviat","tard"]);
    });
    prova("una entrada esborrada en un aparell no torna, encara que l'altre sigui més nou",function(){
      var base=visit({entries:[ent("e1",0),ent("e2",1)]});
      var a=change(base,10,function(x){return Object.assign({},x,{entries:x.entries.filter(function(e){return e.id!=="e2"}),updatedAt:at(10)})});
      var b=change(base,20,withField("notes","mentrestant",20));
      igual(ids(merge(a,b)),["e1"],"A amb B");
      igual(ids(merge(b,a)),["e1"],"B amb A");
    });
    prova("una entrada vella que falta a la còpia nova no ressuscita",function(){
      var w=visit({entries:[ent("e1",0)],modAt:at(20)});
      var o=visit({entries:[ent("e1",0),ent("vella",1)],modAt:at(10)});
      igual(ids(merge(o,w)),["e1"]);
    });
    prova("la mateixa entrada editada als dos aparells: guanya l'última edició",function(){
      var base=visit();
      function edit(text,m){return function(v){return Object.assign({},v,{entries:[Object.assign({},v.entries[0],{text:text})],updatedAt:at(m)})}}
      var a=change(base,10,edit("la d'A",10)),b=change(base,20,edit("la de B",20));
      igual(merge(a,b).entries[0].text,"la de B","A amb B");
      igual(merge(b,a).entries[0].text,"la de B","B amb A");
    });
    prova("l'última edició d'una entrada guanya encara que la seva visita sigui la còpia més vella",function(){
      var base=visit();
      function edit(text,m){return function(v){return Object.assign({},v,{entries:[Object.assign({},v.entries[0],{text:text})],updatedAt:at(m)})}}
      var a=change(base,10,edit("la d'A",10)),b=change(base,20,edit("la de B",20));
      a=change(a,30,withField("notes","nota d'A",30));          // A's copy is now the later visit
      var m=merge(a,b);
      igual(m.entries[0].text,"la de B","el text de l'entrada");
      igual(m.notes,"nota d'A","la nota");
    });
    prova("camps diferents canviats a cada aparell: es conserven tots dos",function(){
      var base=visit(),a=change(base,10,withField("notes","nota d'A",10)),b=change(base,20,withField("status","closed",20));
      var m=merge(a,b);
      igual([m.notes,m.status],["nota d'A","closed"],"A amb B");
      m=merge(b,a);
      igual([m.notes,m.status],["nota d'A","closed"],"B amb A");
    });
    prova("el mateix camp canviat als dos: guanya l'últim canvi, no l'última còpia",function(){
      var base=visit(),a=change(base,10,withField("notes","nota d'A",10)),b=change(base,20,withField("notes","nota de B",20));
      a=change(a,30,withField("status","closed",30));          // A's copy is the later visit, B's note the later note
      var m=merge(a,b);
      igual([m.notes,m.status],["nota de B","closed"]);
    });
    prova("fusionar en un ordre o en l'altre dona el mateix contingut",function(){
      var base=visit({entries:[ent("e1",0),ent("e2",1)]});
      var a=change(base,10,withEntry(ent("eA",5),10));
      a=change(a,12,withField("notes","nota d'A",12));
      var b=change(base,20,function(x){return Object.assign({},x,{entries:x.entries.filter(function(e){return e.id!=="e2"}),status:"closed",updatedAt:at(20)})});
      igual(content(merge(a,b)),content(merge(b,a)));
    });
    prova("la fusió s'assenta: tornar a fusionar amb qualsevol de les dues no canvia res",function(){
      var base=visit(),a=change(base,10,withEntry(ent("eA",5),10)),b=change(base,20,withField("notes","nota de B",20));
      var m=merge(a,b);
      minute=1100;
      cert(F.mergeSessionLists([clone(a)],[m])[0]===m,"amb la còpia d'A hauria de tornar el mateix objecte");
      cert(F.mergeSessionLists([clone(b)],[m])[0]===m,"amb la còpia de B hauria de tornar el mateix objecte");
    });
    prova("amb el mateix segell guanya la còpia d'aquest aparell (la segona llista)",function(){
      var a=visit({notes:"de Drive",modAt:at(10)}),b=visit({notes:"d'aquest aparell",modAt:at(10)});
      igual(merge(a,b).notes,"d'aquest aparell");
    });
    prova("dues còpies d'abans de les marques: guanya sencera la més nova",function(){
      var a=visit({notes:"vella",updatedAt:at(10),entries:[ent("e1",0),ent("eVella",1)]});
      var b=visit({notes:"nova",updatedAt:at(20),entries:[ent("e1",0)]});
      var m=merge(a,b);
      igual([m.notes,ids(m)],["nova",["e1"]]);
    });

    // ─────────────────────────────────────────────────────────────────────
    grup("La revisió de l'informe després d'una fusió");
    prova("contingut agafat de l'altra còpia: la visita consta com a canviada ara",function(){
      var base=visit(),a=change(base,10,withEntry(ent("eA",5),10)),b=change(base,20,withField("notes","nota de B",20));
      igual(merge(a,b).updatedAt,at(1000));
    });
    prova("només s'agafa l'idioma de l'informe: no consta com a canvi de contingut",function(){
      var base=visit(),a=change(base,10,withField("reportLang","de",10,true)),b=change(base,20,withField("notes","nota de B",20));
      var m=merge(a,b);
      igual(m.reportLang,"de","l'idioma");
      igual(m.updatedAt,at(20),"updatedAt");
    });

    // ─────────────────────────────────────────────────────────────────────
    grup("Despeses");
    function exp(id,no,m,extra){return Object.assign({id:id,no:no,noAt:at(m),xAt:at(m),amount:10,imgs:[]},extra||{})}
    prova("una despesa afegida a cada aparell: es conserven totes dues",function(){
      var a=visit({expenses:[exp("x1",1,5)],exSeq:1,modAt:at(10)}),b=visit({expenses:[exp("x2",2,6)],exSeq:2,modAt:at(20)});
      igual(merge(a,b).expenses.map(function(x){return x.id}).sort(),["x1","x2"]);
    });
    prova("una despesa esborrada en un aparell no torna",function(){
      var a=visit({expenses:[],exGone:[{id:"x1",at:at(10)}],exSeq:1,modAt:at(10)});
      var b=visit({expenses:[exp("x1",1,5)],exSeq:1,modAt:at(20)});
      igual(merge(a,b).expenses.length,0,"A amb B");
      igual(merge(b,a).expenses.length,0,"B amb A");
    });
    prova("la mateixa despesa canviada als dos: guanya l'últim canvi",function(){
      var a=visit({expenses:[exp("x1",1,5,{amount:11,xAt:at(30)})],exSeq:1,modAt:at(10)});
      var b=visit({expenses:[exp("x1",1,5,{amount:22,xAt:at(15)})],exSeq:1,modAt:at(40)});
      igual(merge(a,b).expenses[0].amount,11);
    });
    prova("el mateix número donat a dues despeses: cap número repetit, i es queda el de la primera",function(){
      var a=visit({expenses:[exp("xa",3,5)],exSeq:3,modAt:at(10)}),b=visit({expenses:[exp("xb",3,8)],exSeq:3,modAt:at(20)});
      var l=merge(a,b).expenses,by={};
      l.forEach(function(x){by[x.id]=x.no});
      igual(by.xa,3,"la que el va rebre primer");
      cert(by.xb&&by.xb!==3,"l'altra ha de passar a un número lliure, i té el "+by.xb);
    });

    // ─────────────────────────────────────────────────────────────────────
    grup("Visites esborrades");
    prova("la nota d'esborrat atura la còpia amb la mateixa carpeta i la que no en té",function(){
      var m={v1:{f:"F1",done:false,at:at(10)}};
      cert(F.goneBlocks(m,visit({folderId:"F1",updatedAt:at(5)})),"mateixa carpeta");
      cert(F.goneBlocks(m,visit({updatedAt:at(5)})),"sense carpeta");
    });
    prova("no atura una visita tornada a importar (carpeta nova) ni una altra visita",function(){
      var m={v1:{f:"F1",done:false,at:at(10)}};
      cert(!F.goneBlocks(m,visit({folderId:"F2",updatedAt:at(5)})),"carpeta nova");
      cert(!F.goneBlocks(m,visit({id:"v2",folderId:"F1",updatedAt:at(5)})),"una altra visita");
    });
    prova("una visita canviada després d'esborrar-la torna",function(){
      var m={v1:{f:"F1",done:false,at:at(10)}};
      cert(!F.goneBlocks(m,visit({folderId:"F1",updatedAt:at(20)})));
    });

    // ─────────────────────────────────────────────────────────────────────
    grup("Fitxer d'historial");
    function rec(id,m,extra){return Object.assign({id:id,at:at(m),client:"Client de prova"},extra||{})}
    function H(visits,extra){return Object.assign({v:1,visits:visits,seen:{},office:{}},extra||{})}
    prova("es conserven les visites de tots dos, i de cada una la fitxa més nova",function(){
      var m=F.histMerge(H({v1:rec("v1",10,{n:"vella"}),v2:rec("v2",5)}),H({v1:rec("v1",20,{n:"nova"}),v3:rec("v3",5)}));
      igual(Object.keys(m.visits).sort(),["v1","v2","v3"]);
      igual(m.visits.v1.n,"nova");
    });
    prova("un esborrat posterior a la fitxa guanya, i una fitxa posterior a l'esborrat torna",function(){
      var del=function(m){return {id:"v1",del:true,at:at(m)}};
      cert(F.histMerge(H({v1:rec("v1",10)}),H({v1:del(20)})).visits.v1.del===true,"l'esborrat és posterior");
      cert(!F.histMerge(H({v1:rec("v1",30)}),H({v1:del(20)})).visits.v1.del,"la fitxa és posterior");
    });
    prova("l'esborrat d'una visita arxivada no es perd en fusionar, si no és que la fitxa és més nova",function(){
      var m=F.histMerge(H({v1:rec("v1",5,{gone:at(10)})}),H({v1:rec("v1",8)}));
      igual(m.visits.v1.gone,at(10),"la fitxa és anterior a l'esborrat");
      m=F.histMerge(H({v1:rec("v1",5,{gone:at(10)})}),H({v1:rec("v1",20)}));
      cert(!m.visits.v1.gone,"la fitxa és posterior a l'esborrat");
    });
    prova("de cada nota d'oficina es queda l'última, també si és per desfer-la",function(){
      var k="v1|e1";
      function off(m,extra){var o={};o[k]=Object.assign({s:"v1",e:"e1",mod:at(m),text:"nota "+m},extra||{});return o}
      igual(F.histMerge(H({},{office:off(10)}),H({},{office:off(20)})).office[k].text,"nota 20");
      cert(F.histMerge(H({},{office:off(30,{del:true})}),H({},{office:off(20)})).office[k].del===true,"la retirada és posterior");
    });
    prova("fusionar l'historial en un ordre o en l'altre dona el mateix, i repetir-ho no canvia res",function(){
      var a=H({v1:rec("v1",10),v2:{id:"v2",del:true,at:at(30)},v4:rec("v4",5,{gone:at(9)})},{seen:{F1:1}});
      var b=H({v1:rec("v1",20),v2:rec("v2",15),v3:rec("v3",5),v4:rec("v4",7)},{seen:{F2:1}});
      var m=F.histMerge(a,b);
      igual(m,F.histMerge(b,a),"l'ordre");
      igual(F.histMerge(m,a),m,"repetir amb A");
      igual(F.histMerge(b,m),m,"repetir amb B");
      igual(Object.keys(m.seen).sort(),["F1","F2"],"les carpetes vistes");
    });

    // ─────────────────────────────────────────────────────────────────────
    grup("Llista d'usuaris");
    function U(dev,man,gone){return {v:1,dev:dev||{},man:man||{},gone:gone||{}}}
    prova("de cada aparell es queda la fila més nova",function(){
      var m=F.usrMerge(U({d1:{name:"Nom vell",at:at(10)},d2:{name:"Dos",at:at(5)}}),U({d1:{name:"Nom nou",at:at(20)}}));
      igual([m.dev.d1.name,m.dev.d2.name],["Nom nou","Dos"]);
    });
    prova("una fila treta no torna, si no és que s'ha tornat a escriure després",function(){
      cert(!F.usrMerge(U({d1:{name:"Fora",at:at(10)}}),U({},{},{d1:at(20)})).dev.d1,"treta després d'escriure-la");
      cert(!!F.usrMerge(U({d1:{name:"Torna",at:at(30)}}),U({},{},{d1:at(20)})).dev.d1,"escrita després de treure-la");
    });
    prova("fusionar la llista en un ordre o en l'altre dona el mateix",function(){
      var a=U({d1:{name:"A",at:at(10)}},{m1:{name:"Manual",at:at(3)}},{d3:at(8)});
      var b=U({d1:{name:"B",at:at(20)},d3:{name:"Tres",at:at(5)}},{},{m1:at(9)});
      igual(F.usrMerge(a,b),F.usrMerge(b,a));
    });
  }catch(e){
    R.push({g:"(banc de proves)",n:"les proves no han pogut acabar",ok:false,m:String((e&&e.stack)||e)});
  }

  // leave the app as it was found
  window.__realNow=realNow;app("now=window.__realNow");
  setS([]);
  done();
})();
