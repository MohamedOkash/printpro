import { useState, useRef } from 'react'
import {
  Upload, FileText, FileArchive, FilePlus2, SplitSquareHorizontal,
  FileEdit, RefreshCcw, Loader2, CheckCircle2, AlertTriangle,
  X, Hash, Stamp,
} from 'lucide-react'
import { useApp } from '../context/AppContext'
import { loadScript, CDN } from '../utils/scriptLoader'

export default function FileConverter() {
  const { addHistoryItem } = useApp()
  const [mode,setMode]=useState('convert');
  const [files,setFiles]=useState([]);
  const [targetFmt,setTargetFmt]=useState('pdf');
  const [splitRange,setSplitRange]=useState('1-5');
  const [state,setState]=useState('idle');
  const [progress,setProgress]=useState('');
  const [pageNumEnabled,setPageNumEnabled]=useState(true);
  const [pageNumPos,setPageNumPos]=useState('bottom-center');
  const [pageNumSize,setPageNumSize]=useState(18);
  const [pageNumStart,setPageNumStart]=useState(1);
  const [stampEnabled,setStampEnabled]=useState(false);
  const [stampText,setStampText]=useState('');
  const [stampOpacity,setStampOpacity]=useState(20);
  const fileRef=useRef(null);
  const addRef=useRef(null);

  const onFiles=(e,append=false)=>{
    const arr=Array.from(e.target.files); if(!arr.length)return;
    if(append)setFiles(p=>[...p,...arr]);
    else{
      setFiles(arr);
      if(arr[0].name.endsWith('.pdf'))setTargetFmt('zip');
      else if(arr[0].name.match(/\.xlsx?$/i))setTargetFmt('pdf');
      else setTargetFmt('pdf');
    }
    setState('idle'); setProgress(''); e.target.value='';
  };

  const startTask=async()=>{
    if(!files.length)return; setState('processing'); setProgress('');
    try{
      if(mode==='merge'){
        setProgress('دمج ملفات PDF…');
        const{PDFDocument}=await loadScript('https://cdnjs.cloudflare.com/ajax/libs/pdf-lib/1.17.1/pdf-lib.min.js','PDFLib');
        const merged=await PDFDocument.create();
        for(let i=0;i<files.length;i++){
          setProgress(`دمج ${i+1}/${files.length}…`);
          const pdf=await PDFDocument.load(await files[i].arrayBuffer());
          const pages=await merged.copyPages(pdf,pdf.getPageIndices());
          pages.forEach(p=>merged.addPage(p));
        }
        const blob=new Blob([await merged.save()],{type:'application/pdf'});
        const url=URL.createObjectURL(blob);
        const a=document.createElement('a');a.href=url;a.download='PrintPro_Merged.pdf';a.click();URL.revokeObjectURL(url);
        addHistoryItem({type:'merge',name:`دمج ${files.length} ملفات`,thumb:null});
        setState('done');
      } else if(mode==='split'){
        setProgress('تقسيم PDF…');
        const{PDFDocument}=await loadScript('https://cdnjs.cloudflare.com/ajax/libs/pdf-lib/1.17.1/pdf-lib.min.js','PDFLib');
        const pdf=await PDFDocument.load(await files[0].arrayBuffer());
        const parts=splitRange.split('-').map(n=>parseInt(n.trim())-1);
        let[start,end]=[Math.max(0,parts[0]||0),Math.min(pdf.getPageCount()-1,parts[1]??parts[0]??0)];
        const newPdf=await PDFDocument.create();
        const copied=await newPdf.copyPages(pdf,Array.from({length:end-start+1},(_,i)=>i+start));
        copied.forEach(p=>newPdf.addPage(p));
        const blob=new Blob([await newPdf.save()],{type:'application/pdf'});
        const url=URL.createObjectURL(blob);
        const a=document.createElement('a');a.href=url;a.download=`PrintPro_p${start+1}-${end+1}.pdf`;a.click();URL.revokeObjectURL(url);
        addHistoryItem({type:'split',name:`صفحات ${start+1}-${end+1}`,thumb:null});
        setState('done');
      } else if(mode==='edit'){
        setProgress('تحميل مكتبة PDF-lib…');
        const{PDFDocument,rgb,StandardFonts}=await loadScript('https://cdnjs.cloudflare.com/ajax/libs/pdf-lib/1.17.1/pdf-lib.min.js','PDFLib');
        const pdf=await PDFDocument.load(await files[0].arrayBuffer());
        const font=await pdf.embedFont(StandardFonts.HelveticaBold);
        const pages=pdf.getPages();
        pages.forEach((page,idx)=>{
          const{width,height}=page.getSize();
          if(pageNumEnabled){
            const num=`${pageNumStart+idx}`;
            const fs=pageNumSize; const tw=font.widthOfTextAtSize(num,fs);
            let x=width/2-tw/2, y=20;
            if(pageNumPos==='bottom-right'){x=width-tw-20;}
            else if(pageNumPos==='bottom-left'){x=20;}
            else if(pageNumPos==='top-center'){y=height-20-fs;}
            page.drawText(num,{x,y,size:fs,font,color:rgb(.15,.15,.15),opacity:.85});
          }
          if(stampEnabled&&stampText){
            const fs2=Math.max(18,width/20);
            const tw2=font.widthOfTextAtSize(stampText,fs2);
            page.drawText(stampText,{x:width/2-tw2/2,y:height/2-fs2/2,size:fs2,font,color:rgb(.5,.5,.5),opacity:stampOpacity/100,rotate:{type:'degrees',angle:45}});
          }
        });
        setProgress('جاري الحفظ…');
        const blob=new Blob([await pdf.save()],{type:'application/pdf'});
        const url=URL.createObjectURL(blob);
        const a=document.createElement('a');a.href=url;a.download='PrintPro_Edited.pdf';a.click();URL.revokeObjectURL(url);
        addHistoryItem({type:'edit',name:'تحرير PDF',thumb:null});
        setState('done');
      } else {
        const file=files[0];
        if(file.name.endsWith('.pdf')&&targetFmt==='zip'){
          setProgress('تحميل PDF.js و JSZip…');
          const JSZip=await loadScript('https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js','JSZip');
          const pdfjsLib=await loadScript('https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js','pdfjsLib');
          pdfjsLib.GlobalWorkerOptions.workerSrc='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
          const pdfDoc=await pdfjsLib.getDocument(await file.arrayBuffer()).promise;
          const zip=new JSZip(); const folder=zip.folder('pages');
          for(let i=1;i<=pdfDoc.numPages;i++){
            setProgress(`صفحة ${i}/${pdfDoc.numPages}…`);
            const page=await pdfDoc.getPage(i); const vp=page.getViewport({scale:2.5});
            const c=document.createElement('canvas');c.width=vp.width;c.height=vp.height;
            await page.render({canvasContext:c.getContext('2d'),viewport:vp}).promise;
            folder.file(`page_${String(i).padStart(3,'0')}.jpg`,await new Promise(r=>c.toBlob(r,'image/jpeg',.95)));
          }
          const zipBlob=await zip.generateAsync({type:'blob'},m=>setProgress(`ضغط ${Math.round(m.percent)}%…`));
          const url=URL.createObjectURL(zipBlob);
          const a=document.createElement('a');a.href=url;a.download=`${file.name.replace('.pdf','')}_images.zip`;a.click();URL.revokeObjectURL(url);
          addHistoryItem({type:'convert',name:`${file.name} → صور`,thumb:null});
          setState('done');
        } else if(file.name.match(/\.xlsx?$/i)){
          setProgress('معالجة Excel…');
          const XLSX=await loadScript('https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js','XLSX');
          const{jsPDF}=await loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js','jspdf');
          await loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.5.25/jspdf.plugin.autotable.min.js','jsPDFAutoTable');
          const wb=XLSX.read(await file.arrayBuffer(),{type:'array'});
          const json=XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]],{header:1});
          const pdf=new jsPDF({orientation:'landscape',unit:'pt',format:'a4'});
          pdf.autoTable({head:[json[0]?.map(String)||[]],body:json.slice(1).map(r=>r.map(String)),styles:{fontSize:9},headStyles:{fillColor:[79,70,229]},margin:{top:30}});
          pdf.save(`PrintPro_${file.name.replace(/\.xlsx?/i,'')}.pdf`);
          addHistoryItem({type:'convert',name:`${file.name} → PDF`,thumb:null});
          setState('done');
        } else { setProgress('صيغة غير مدعومة حالياً'); setTimeout(()=>setState('idle'),2000); }
      }
    } catch(err){ console.error(err); setProgress('حدث خطأ. تحقق من الملف وحاول مجدداً.'); setState('error'); }
  };

  const MODES=[
    {id:'convert',label:'محوّل',     c:'amber', icon:FileArchive},
    {id:'merge',  label:'دمج PDF',   c:'indigo',icon:FilePlus2},
    {id:'split',  label:'تقسيم',     c:'emerald',icon:SplitSquareHorizontal},
    {id:'edit',   label:'تحرير PDF', c:'rose',  icon:FileEdit},
  ];
  const cfg=MODES.find(m=>m.id===mode)||MODES[0];
  const BG={amber:'bg-amber-600',indigo:'bg-indigo-600',emerald:'bg-emerald-600',rose:'bg-rose-600'};

  return(
    <div className="flex flex-col h-full bg-[#0a0a0d] overflow-y-auto p-4 md:p-8">
      <div className="flex bg-[#131317] rounded-2xl p-1 border border-white/5 max-w-md mx-auto w-full mb-6 mt-2 gap-1">
        {MODES.map(m=>(
          <button key={m.id} onClick={()=>{setMode(m.id);setFiles([]);setState('idle');}}
            className={`flex-1 py-2.5 text-[10px] md:text-xs font-bold rounded-xl transition-all ${mode===m.id?`${BG[m.c]} text-white shadow-lg`:'text-slate-500 hover:text-white'}`}>
            {m.label}
          </button>
        ))}
      </div>

      <div className="flex-1 flex flex-col items-center justify-center max-w-md mx-auto w-full gap-4">
        {state==='idle'&&files.length===0&&(
          <div className="fu w-full bg-[#131317] border border-white/5 rounded-3xl p-8 md:p-10 flex flex-col items-center text-center shadow-2xl">
            <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-5 bg-${cfg.c}-500/10 border border-${cfg.c}-500/20`}>
              <cfg.icon size={36} className={`text-${cfg.c}-400`}/>
            </div>
            <h2 className="text-xl font-black text-white mb-2">{cfg.label}</h2>
            <p className="text-sm text-slate-500 mb-8">
              {mode==='merge'?'ادمج عدة ملفات PDF في ملف واحد':mode==='split'?'استخرج صفحات محددة من PDF':mode==='edit'?'أضف ترقيم وختم على جميع الصفحات':'حوّل PDF إلى صور أو Excel إلى PDF'}
            </p>
            <input ref={fileRef} type="file" className="hidden" accept=".pdf,.xlsx,.xls" multiple={mode==='merge'} onChange={onFiles}/>
            <button onClick={()=>fileRef.current.click()} className={`w-full ${BG[cfg.c]} text-white font-black py-4 rounded-2xl flex items-center justify-center gap-2 active:scale-95 transition-all shadow-lg`}>
              <Upload size={20}/>رفع ملف{mode==='merge'?'ات':''}
            </button>
          </div>
        )}

        {state==='idle'&&files.length>0&&(
          <div className="fu w-full space-y-4">
            <input ref={fileRef} type="file" className="hidden" accept=".pdf,.xlsx,.xls" multiple={mode==='merge'} onChange={onFiles}/>
            <input ref={addRef} type="file" className="hidden" accept=".pdf" multiple onChange={e=>onFiles(e,true)}/>
            <div className="bg-[#131317] border border-white/5 rounded-2xl p-3 max-h-48 sc space-y-2">
              {files.map((f,i)=>(
                <div key={i} className="flex items-center justify-between bg-white/5 border border-white/5 rounded-xl px-4 py-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <FileText size={13} className="text-slate-400 flex-shrink-0"/>
                    <span className="text-sm font-bold text-slate-300 truncate">{f.name}</span>
                  </div>
                  {mode==='merge'&&<button onClick={()=>setFiles(p=>p.filter((_,idx)=>idx!==i))} className="text-red-400 p-1 hover:bg-red-500/20 rounded-lg ml-2"><X size={13}/></button>}
                </div>
              ))}
              {mode==='merge'&&<button onClick={()=>addRef.current.click()} className="w-full py-2.5 text-indigo-400 text-xs font-bold border border-dashed border-indigo-500/30 rounded-xl hover:bg-indigo-500/5">+ إضافة ملف</button>}
            </div>

            <div className="bg-[#131317] border border-white/5 rounded-2xl p-4 space-y-4">
              {mode==='convert'&&(
                <select value={targetFmt} onChange={e=>setTargetFmt(e.target.value)} className="w-full bg-black text-white font-bold p-3 rounded-xl outline-none text-center text-sm appearance-none">
                  {files[0]?.name.endsWith('.pdf')&&<option value="zip">PDF → صور عالية الجودة (ZIP)</option>}
                  {files[0]?.name.match(/\.xlsx?$/i)&&<option value="pdf">Excel → PDF جاهز للطباعة</option>}
                </select>
              )}
              {mode==='split'&&(
                <div className="flex items-center gap-3 bg-black/50 rounded-xl px-4 py-3">
                  <span className="text-xs font-bold text-slate-400 whitespace-nowrap">نطاق الصفحات:</span>
                  <input type="text" value={splitRange} onChange={e=>setSplitRange(e.target.value)} placeholder="1-5" className="flex-1 bg-transparent text-white font-bold text-center outline-none text-base" dir="ltr"/>
                </div>
              )}
              {mode==='merge'&&<p className="text-sm text-slate-400 text-center font-bold">سيتم دمج {files.length} ملفات بالترتيب</p>}
              {mode==='edit'&&(
                <div className="space-y-4">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input type="checkbox" checked={pageNumEnabled} onChange={e=>setPageNumEnabled(e.target.checked)} className="w-4 h-4 accent-rose-500"/>
                    <span className="text-sm font-bold text-white flex items-center gap-2"><Hash size={14} className="text-rose-400"/>ترقيم الصفحات</span>
                  </label>
                  {pageNumEnabled&&(
                    <div className="space-y-3 pr-6">
                      <div className="grid grid-cols-2 gap-2">
                        {[['bottom-center','أسفل وسط'],['bottom-right','أسفل يمين'],['bottom-left','أسفل يسار'],['top-center','أعلى وسط']].map(([v,l])=>(
                          <button key={v} onClick={()=>setPageNumPos(v)} className={`py-2 rounded-xl text-[10px] font-bold border transition-all ${pageNumPos===v?'bg-rose-500/20 text-rose-300 border-rose-500/40':'bg-white/5 text-slate-400 border-white/5'}`}>{l}</button>
                        ))}
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-slate-400 font-bold whitespace-nowrap">يبدأ من:</span>
                        <input type="number" min={1} value={pageNumStart} onChange={e=>setPageNumStart(Number(e.target.value))} className="w-14 bg-black/50 border border-white/10 rounded-lg px-2 py-1.5 text-white text-sm font-bold text-center outline-none"/>
                        <span className="text-xs text-slate-400 font-bold">حجم:</span>
                        <input type="range" min={10} max={36} value={pageNumSize} onChange={e=>setPageNumSize(Number(e.target.value))} className="flex-1 h-1.5 accent-rose-500"/>
                        <span className="text-xs text-rose-400 font-bold w-6">{pageNumSize}</span>
                      </div>
                    </div>
                  )}
                  <div className="pt-3 border-t border-white/5 space-y-3">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input type="checkbox" checked={stampEnabled} onChange={e=>setStampEnabled(e.target.checked)} className="w-4 h-4 accent-orange-500"/>
                      <span className="text-sm font-bold text-white flex items-center gap-2"><Stamp size={14} className="text-orange-400"/>ختم على الصفحات</span>
                    </label>
                    {stampEnabled&&(
                      <div className="space-y-3 pr-6">
                        <input type="text" value={stampText} onChange={e=>setStampText(e.target.value)} placeholder="اسم المكتبة، السنتر..." className="w-full bg-black/50 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm font-bold outline-none focus:border-orange-500 transition-colors"/>
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-slate-400 font-bold">الشفافية</span>
                          <input type="range" min={5} max={60} value={stampOpacity} onChange={e=>setStampOpacity(Number(e.target.value))} className="flex-1 h-1.5 accent-orange-500"/>
                          <span className="text-xs text-orange-400 font-bold w-8 text-center">{stampOpacity}%</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <button onClick={startTask} className={`w-full ${BG[cfg.c]} text-white font-black py-4 rounded-2xl flex items-center justify-center gap-2 active:scale-95 transition-all shadow-xl`}>
              <RefreshCcw size={18}/>بدء المهمة
            </button>
            <button onClick={()=>setFiles([])} className="text-slate-500 text-sm font-bold py-2 w-full hover:text-white transition-colors">إلغاء</button>
          </div>
        )}

        {state==='processing'&&(
          <div className="fu flex flex-col items-center text-center gap-4">
            <div className={`w-20 h-20 rounded-full bg-${cfg.c}-500/10 border border-${cfg.c}-500/20 flex items-center justify-center`}>
              <Loader2 size={36} className={`text-${cfg.c}-400 animate-spin`}/>
            </div>
            <p className="text-xl font-black text-white">جاري المعالجة…</p>
            {progress&&<p className="text-sm text-slate-400 font-bold bg-white/5 px-5 py-2.5 rounded-full border border-white/5">{progress}</p>}
          </div>
        )}

        {state==='done'&&(
          <div className="fu w-full bg-[#131317] border border-emerald-500/20 rounded-3xl p-10 flex flex-col items-center text-center shadow-[0_0_40px_rgba(16,185,129,.08)]">
            <div className="w-20 h-20 bg-emerald-500/20 border border-emerald-500/20 rounded-full flex items-center justify-center mb-5">
              <CheckCircle2 size={44} className="text-emerald-400"/>
            </div>
            <h2 className="text-2xl font-black text-white mb-8">تم بنجاح!</h2>
            <button onClick={()=>{setFiles([]);setState('idle');setProgress('');}} className="w-full bg-white/10 hover:bg-white/15 text-white font-bold py-4 rounded-2xl transition-colors">
              مهمة جديدة
            </button>
          </div>
        )}

        {state==='error'&&(
          <div className="fu w-full bg-[#131317] border border-red-500/20 rounded-3xl p-8 flex flex-col items-center text-center gap-4">
            <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center"><AlertTriangle size={32} className="text-red-400"/></div>
            <p className="text-red-300 font-bold text-sm">{progress}</p>
            <button onClick={()=>{setState('idle');setProgress('');}} className="w-full bg-white/10 hover:bg-white/15 text-white font-bold py-3 rounded-2xl transition-colors text-sm">حاول مجدداً</button>
          </div>
        )}
      </div>
    </div>
  );
}

