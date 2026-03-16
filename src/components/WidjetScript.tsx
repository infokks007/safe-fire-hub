import { useEffect } from "react";

declare global {
  interface Window {
    __wj?: {
      widgetId?: string;
      product_name?: string;
    };
  }
}

export function WidjetScript() {
  useEffect(() => {
    window.__wj = window.__wj || {};
    window.__wj.widgetId = "07d90805-e9b7-4552-b09a-b1a901670113";
    window.__wj.product_name = "widjet";

    const existing = document.querySelector('script[data-widjet-loader="true"]');
    if (existing) return;

    const firstScript = document.getElementsByTagName("script")[0];
    const loader = document.createElement("script");
    loader.async = true;
    loader.src = "https://jqvcafbrccpmygiihyry.supabase.co/functions/v1/widget-loader";
    loader.setAttribute("data-widjet-loader", "true");

    if (firstScript?.parentNode) {
      firstScript.parentNode.insertBefore(loader, firstScript);
    } else {
      document.head.appendChild(loader);
    }
  }, []);

  return <noscript>Enable JavaScript to use the widget powered by Widjet</noscript>;
}
