'use client';
import {useState} from 'react';
import {createClient} from '../../lib/supabase';
import {ImagePlus,Upload,Loader2} from 'lucide-react';

const MAX_IMAGES = 6;
const MAX_IMAGE_SIZE = 10 * 1024 * 1024;

function withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(message)), ms);
    promise.then(value => { clearTimeout(timer); resolve(value); }, error => { clearTimeout(timer); reject(error); });
  });
}

export default function Sell(){
  const [title,setTitle]=useState('');
  const [price,setPrice]=useState('');
  const [category,setCategory]=useState('Phones & Gadgets');
  const [description,setDescription]=useState('');
  const [campus,setCampus]=useState('');
  const [files,setFiles]=useState<File[]>([]);
  const [error,setError]=useState('');
  const [loading,setLoading]=useState(false);
  const [progress,setProgress]=useState('');

  async function submit(e:React.FormEvent){
    e.preventDefault();
    if(loading) return;
    setLoading(true); setError(''); setProgress('Checking your account...');
    const supabase=createClient();
    try {
      const {data:{user},error:userError}=await withTimeout(supabase.auth.getUser(),15000,'Your sign-in session could not be verified. Please sign in again.');
      if(userError || !user){ window.location.assign('/auth/login?next=/sell'); return; }
      const cleanTitle=title.trim().slice(0,120); const cleanDescription=description.trim().slice(0,5000); const cleanCampus=campus.trim().slice(0,120); if(cleanTitle.length<3) throw new Error('Title must be at least 3 characters.'); if(cleanDescription.length<10) throw new Error('Description must be at least 10 characters.'); if(cleanCampus.length<2) throw new Error('Please enter a valid campus.'); const numericPrice=Number(price);
      if(!Number.isFinite(numericPrice) || numericPrice < 0) throw new Error('Please enter a valid price.');
      if(files.length>MAX_IMAGES) throw new Error(`You can upload up to ${MAX_IMAGES} photos.`);
      for(const file of files){
        if(file.size>MAX_IMAGE_SIZE) throw new Error(`${file.name} is larger than 10MB.`);
        if(!file.type.startsWith('image/')) throw new Error(`${file.name} is not an image.`);
      }

      setProgress('Creating your listing...');
      const {data:listing,error:listingError}=await withTimeout(
        supabase.from('listings').insert({title:cleanTitle,price:numericPrice,category,description:cleanDescription,campus:cleanCampus,seller_id:user.id,status:'available'}).select().single(),
        20000,
        'The listing request timed out. Please try again.'
      );
      if(listingError || !listing) throw new Error(listingError?.message || 'Could not create your listing.');

      const imageErrors:string[]=[];
      for(let i=0;i<files.length;i++){
        const file=files[i];
        setProgress(files.length===1?'Uploading photo...':`Uploading photo ${i+1} of ${files.length}...`);
        const ext=(file.name.split('.').pop()||'jpg').toLowerCase();
        const path=`${user.id}/${listing.id}/${i}-${crypto.randomUUID()}.${ext}`;
        const up=await withTimeout(
          supabase.storage.from('listing-images').upload(path,file,{contentType:file.type,upsert:false,cacheControl:'3600'}),
          30000,
          'Image upload timed out. Your listing was created, but the photo could not be uploaded.'
        );
        if(up.error){ imageErrors.push(up.error.message); continue; }
        const {data:publicUrl}=supabase.storage.from('listing-images').getPublicUrl(path);
        const imageRow=await supabase.from('listing_images').insert({listing_id:listing.id,url:publicUrl.publicUrl,storage_path:path,sort_order:i});
        if(imageRow.error) imageErrors.push(imageRow.error.message);
      }

      setProgress(imageErrors.length ? 'Listing published. Opening it now...' : 'Listing published. Opening it now...');
      window.location.assign(`/product/${listing.id}`);
    } catch(err:any) {
      setError(err?.message || 'Something went wrong while publishing. Please try again.');
      setProgress('');
      setLoading(false);
    }
  }

  return <main className="formPage"><div className="formCard">
    <div className="eyebrow">Sell on CampusDrop</div><h1>Create a listing</h1>
    <p className="muted">Add your item and publish it to the campus marketplace.</p>
    {error&&<div className="error">{error}</div>}
    <form onSubmit={submit}>
      <div className="field"><label htmlFor="listingTitle">Title</label><input id="listingTitle" maxLength={120} value={title} onChange={e=>setTitle(e.target.value)} placeholder="e.g. iPhone 13 Pro" required/></div>
      <div className="split"><div className="field"><label htmlFor="listingPrice">Price (₦)</label><input id="listingPrice" type="number" min="0" step="0.01" value={price} onChange={e=>setPrice(e.target.value)} required/></div><div className="field"><label htmlFor="listingCategory">Category</label><select id="listingCategory" value={category} onChange={e=>setCategory(e.target.value)}><option>Phones & Gadgets</option><option>Laptops</option><option>Fashion</option><option>Books</option><option>Gaming</option><option>Services</option></select></div></div>
      <div className="field"><label htmlFor="listingCampus">Campus</label><input id="listingCampus" maxLength={120} value={campus} onChange={e=>setCampus(e.target.value)} placeholder="Your school / campus" required/></div>
      <div className="field"><label htmlFor="listingDescription">Description</label><textarea id="listingDescription" maxLength={5000} value={description} onChange={e=>setDescription(e.target.value)} placeholder="Tell buyers what they should know..." required/></div>
      <div className="field"><label htmlFor="listingPhotos">Photos</label><div className="panel" style={{padding:14}}><div className="row"><ImagePlus size={20}/><span id="listingPhotosHelp" className="muted">Upload up to 6 clear product photos. Maximum 10MB each.</span></div><input id="listingPhotos" aria-describedby="listingPhotosHelp" type="file" accept="image/jpeg,image/png,image/webp,image/heic" multiple onChange={e=>setFiles(Array.from(e.target.files||[]).slice(0,MAX_IMAGES))} style={{marginTop:12}}/></div></div>
      {progress&&<div className="notice row"><Loader2 size={16} className="spin"/><span>{progress}</span></div>}
      <button className="btn green full" disabled={loading}><Upload size={17}/>{loading?'Publishing...':'Publish listing'}</button>
    </form>
  </div></main>
}
