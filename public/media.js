// Simple lightbox for images tagged with [data-lightbox]
const lb = document.getElementById('lightbox');
const img = document.getElementById('lightboxImg');

document.addEventListener('click', (e)=>{
  const target = e.target.closest('[data-lightbox]');
  if (target && target.tagName === 'IMG'){
    img.src = target.src;
    lb.classList.add('open');
  }
  if (e.target.matches('[data-close]') || e.target === lb){
    lb.classList.remove('open'); img.src='';
  }
});
