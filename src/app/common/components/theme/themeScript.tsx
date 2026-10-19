export const THEME_STORAGE_KEY = 'theme';

// Runs before the page is drawn, so a chosen theme never flashes the system one first
const script = `try{var t=localStorage.getItem('${THEME_STORAGE_KEY}');if(t==='light'||t==='dark')document.documentElement.dataset.theme=t}catch(e){}`;

export default function ThemeScript() {
    return <script dangerouslySetInnerHTML={{ __html: script }} />;
}
