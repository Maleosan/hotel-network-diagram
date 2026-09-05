(function(root,factory){
    const api=factory();
    if(typeof module==="object"&&module.exports)module.exports=api;
    else{root.HotelDiagramHelp=Object.freeze(api);api.initialize();}
})(typeof globalThis!=="undefined"?globalThis:this,function(){
    "use strict";

    const articles=[
        ["login","Getting Started","How to Login with Google?",["Klik Sign in with Google.","Pilih akun Google Anda.","Tunggu diagram pribadi selesai dimuat dari Firebase."],"Diagram setiap akun disimpan terpisah berdasarkan akun yang login."],
        ["add-device","Getting Started","How to Add Device?",["Buka menu ☰ lalu pilih Add Device, atau gunakan panel Add Device di kiri.","Pilih jenis device.","Klik Create atau drag device dari panel ke canvas.","Atur Properties bila diperlukan."],"Di HP, tutup panel Add Device agar area diagram lebih luas."],
        ["edit-device","Getting Started","How to Edit Device?",["Pastikan aplikasi berada di Edit Mode.","Klik device pada diagram.","Ubah nilai pada Properties.","Klik Update."],"Properties tidak ditampilkan pada Read Mode."],
        ["save","Getting Started","How to Save Diagram?",["Untuk cloud, login lalu pilih Save to Cloud.","Untuk file, pilih Export / Save JSON.","Tunggu status Saved sebelum menutup aplikasi."],"Perubahan Edit Mode juga dijadwalkan untuk Auto Save."],
        ["move","Diagram","How to Drag & Move Device?",["Pastikan Edit Mode aktif.","Tekan dan tahan device.","Geser ke posisi tujuan lalu lepaskan."],"Aktifkan Snap agar posisi mengikuti grid."],
        ["connect","Diagram","How to Connect Devices?",["Pilih Add Link.","Klik device pertama.","Klik device kedua.","Atur label, tampilan, dan port pada Properties."],"Cancel Link membatalkan proses pembuatan koneksi."],
        ["specific-port","Diagram","How to Connect Device to Specific Port?",["Buat atau pilih connection.","Buka Properties connection.","Pilih Source Port dan Target Port yang tersedia.","Simpan perubahan connection."],"Port yang sudah digunakan tidak dapat dipakai dua kali."],
        ["port-status","Diagram","How to View Connection Port Status?",["Klik sebuah device.","Buka bagian Connection Status pada Properties.","Lihat port Connected atau Available.","Klik connection yang terhubung untuk membuka detailnya."],"DVR/NVR menggunakan istilah Channel sesuai jumlah channel model."],
        ["zoom-pan","Diagram","How to Zoom & Pan?",["Gunakan roda mouse atau pinch dua jari untuk zoom.","Drag area kosong atau gunakan gesture pan untuk menggeser tampilan.","Zoom out tersedia sampai 10%."],"Gunakan Fit View bila diagram keluar dari layar."],
        ["fit-view","Diagram","How to Fit View?",["Buka menu ☰.","Pilih Fit View.","Aplikasi menghitung seluruh device dan connection lalu memberi margin sesuai layar."],"Tutup Properties jika ingin area diagram yang lebih besar."],
        ["properties","Device","How to Edit Device Properties?",["Aktifkan Edit Mode.","Klik device.","Ubah nama, model, IP, lokasi, status, ukuran, atau catatan.","Klik Update."],"Panel dapat di-scroll pada HP."],
        ["name","Device","How to Change Device Name?",["Klik device saat Edit Mode.","Ubah Device Name pada Properties.","Klik Update."],"Nama dibatasi agar tetap nyaman ditampilkan di diagram."],
        ["text-color","Device","How to Change Text Color?",["Klik device dan buka Properties.","Pilih Device Name Text Color.","Matikan Follow Diagram Theme jika ingin warna khusus.","Klik Update."],"Gunakan Apply Name Style to All Devices untuk menyamakan gaya."],
        ["status-font","Device","How to Change Status Font Size?",["Klik device dan buka Properties.","Atur Status Text Size dan gaya teks.","Klik Update."],"Gunakan Apply Status Text Style to All Devices untuk menerapkannya ke semua device."],
        ["device-status","Device","How to Change Device Status?",["Klik device saat Edit Mode.","Pilih Active, Inactive, atau Problem.","Tambahkan Status Note bila diperlukan.","Klik Update."],"Menu Check Status dapat menampilkan ringkasan jumlah device terpilih."],
        ["image","Device","How to Add Device Image?",["Klik device dan buka Properties.","Pada Device Picture pilih From Computer.","Pilih foto.","Periksa preview dan ukuran hasil kompresi.","Klik Update bila ada perubahan Properties lain."],"Foto dikompres otomatis sebelum disimpan."],
        ["camera","Device","How to Add Image Using Camera?",["Klik device dan buka Properties.","Pilih Camera.","Izinkan kamera bila browser meminta izin.","Ambil foto lalu pilih Use Photo.","Periksa preview hasil kompresi."],"Gunakan HTTPS/GitHub Pages agar akses kamera berfungsi."],
        ["photo-compression","Device","How does Photo Compression work?",["Pilih foto dari komputer atau kamera.","Aplikasi mengecilkan dimensi tanpa memperbesar foto kecil.","Format WebP digunakan bila didukung.","Preview dan ukuran sebelum/sesudah ditampilkan."],"Kompresi menghemat data Firestore dan mempercepat sinkronisasi; Anda tidak perlu mengompres manual."],
        ["load","Files","How to Load Diagram?",["Pilih Import / Load JSON.","Pilih file JSON diagram yang valid.","Periksa diagram setelah dimuat."],"Simpan diagram saat ini terlebih dahulu jika masih diperlukan."],
        ["import-export","Files","How to Import / Export JSON?",["Import: pilih Import / Load JSON lalu buka file.","Export: pilih Export / Save JSON.","Simpan file hasil download sebagai cadangan."],"File JSON menyimpan struktur diagram; foto besar tetap dikompres."],
        ["github-update","Files","How to Update from GitHub?",["Pilih Update from GitHub.","Pilih file JSON dari folder data.","Periksa nama file dan waktu update.","Klik Update."],"Update from GitHub mengganti diagram saat ini dengan file yang dipilih."],
        ["autosave","Files","How does Auto Save work?",["Login dengan Google.","Lakukan perubahan pada Edit Mode.","Tunggu status Saving berubah menjadi Saved.","Gunakan Save to Cloud jika ingin memaksa penyimpanan saat itu juga."],"Saat offline, diagram lokal tetap dipertahankan dan aplikasi memberi peringatan."],
        ["publish","Multi-User","How to Publish Diagram?",["Login dan pastikan diagram sudah tersimpan.","Buka menu ☰ lalu pilih Publish.","Klik Publish dan tunggu selesai.","Diagram muncul sebagai source pada Published Sync List pengguna lain."],"Publish tidak memberi hak edit. Pengguna lain hanya menyalin atau merge ke diagram mereka sendiri."],
        ["sync","Multi-User","How to Sync from Another User?",["Pastikan pemilik source sudah Publish.","Buka Sync / Merge dan pilih source dari Published Sync List.","Pilih Smart Merge, Review Changes, atau Replace Entire Diagram.","Jika ada conflict, pilih Use Source atau Keep Mine.","Tunggu progress mencapai 100% dan status Sync Completed."],"Sync tidak mengubah diagram asli milik source."],
        ["smart-merge","Multi-User","How to Smart Merge?",["Pilih source pada Sync / Merge.","Klik Smart Merge.","Perubahan yang tidak conflict akan digabung otomatis.","Buka Review Changes untuk menyelesaikan conflict yang tersisa."],"Smart Merge mempertahankan perubahan lokal yang tidak bertabrakan."],
        ["conflict","Multi-User","How to Resolve Sync Conflict?",["Klik Review Changes.","Periksa nilai Current dan Source.","Pilih Use Source untuk memakai perubahan source, atau Keep Mine untuk mempertahankan nilai Anda.","Klik Apply Reviewed dan tunggu Sync Completed."],"Conflict terjadi jika Anda dan source mengubah bagian yang sama dengan nilai berbeda."],
        ["replace","Multi-User","How to Replace Entire Diagram?",["Pilih source pada Sync / Merge.","Klik Replace Entire Diagram.","Baca peringatan lalu konfirmasi.","Tunggu proses save selesai dan status Sync Completed."],"PERINGATAN: seluruh device, connection, annotation, dan settings saat ini diganti. Undo tersedia setelah berhasil."],
        ["multi-user","Multi-User","How does Multi-User Sync work?",["Setiap akun memiliki diagram privat sendiri.","Pemilik memilih Publish untuk menjadikannya source.","Pengguna lain dapat Smart Merge, Review, atau Replace pada diagram mereka sendiri.","Base per source disimpan agar sync berikutnya hanya memproses perubahan baru."],"Pengguna lain tidak dapat edit, delete, atau unpublish diagram source."],
        ["logout","Account","How to Logout?",["Buka menu ☰.","Pastikan status cloud sudah Saved.","Klik Logout."],"Login kembali dengan akun yang sama untuk memuat diagram dan foto dari Firestore."]
    ].map(([id,category,title,steps,tip])=>({id,category,title,steps,tip}));

    function filterArticles(query="",category="All"){
        const term=String(query).trim().toLowerCase();
        return articles.filter(article=>(category==="All"||article.category===category)&&(!term||`${article.title} ${article.category} ${article.steps.join(" ")} ${article.tip}`.toLowerCase().includes(term)));
    }
    function categories(){return["All",...new Set(articles.map(article=>article.category))];}

    function initialize(){
        if(typeof document==="undefined")return;
        const modal=document.getElementById("helpModal"),open=document.getElementById("btnHelp"),close=document.getElementById("btnCloseHelp"),back=document.getElementById("btnHelpBack"),search=document.getElementById("helpSearch"),categoryList=document.getElementById("helpCategories"),articleList=document.getElementById("helpArticleList"),home=document.getElementById("helpHome"),detail=document.getElementById("helpDetail"),title=document.getElementById("helpArticleTitle"),body=document.getElementById("helpArticleBody");
        if(!modal||!open)return;
        let selectedCategory="All";
        function renderCategories(){categoryList.innerHTML="";categories().forEach(category=>{const button=document.createElement("button");button.type="button";button.textContent=category;button.className=category===selectedCategory?"active":"";button.addEventListener("click",()=>{selectedCategory=category;renderCategories();renderList();});categoryList.appendChild(button);});}
        function renderList(){articleList.innerHTML="";const matches=filterArticles(search.value,selectedCategory);if(!matches.length){const empty=document.createElement("p");empty.className="helpEmpty";empty.textContent="Panduan tidak ditemukan.";articleList.appendChild(empty);return;}matches.forEach(article=>{const button=document.createElement("button");button.type="button";button.className="helpArticleButton";button.textContent=article.title;button.addEventListener("click",()=>showArticle(article));articleList.appendChild(button);});}
        function showArticle(article){home.hidden=true;detail.hidden=false;back.hidden=false;title.textContent=article.title.toUpperCase();body.innerHTML="";const list=document.createElement("ol");article.steps.forEach(step=>{const item=document.createElement("li");item.textContent=step;list.appendChild(item);});const tip=document.createElement("aside");tip.className="helpTip";const label=article.tip.startsWith("PERINGATAN")?"WARNING":"TIP";tip.textContent=`${label}: ${article.tip.replace(/^PERINGATAN:\s*/,"")}`;body.append(list,tip);back.focus();}
        function showHome(){detail.hidden=true;home.hidden=false;back.hidden=true;renderCategories();renderList();search.focus();}
        function closeHelp(){modal.style.display="none";open.focus();}
        open.addEventListener("click",()=>{modal.style.display="flex";showHome();});close.addEventListener("click",closeHelp);back.addEventListener("click",showHome);search.addEventListener("input",renderList);modal.addEventListener("click",event=>{if(event.target===modal)closeHelp();});document.addEventListener("keydown",event=>{if(event.key==="Escape"&&modal.style.display==="flex")closeHelp();});
    }

    return{articles,categories,filterArticles,initialize};
});
