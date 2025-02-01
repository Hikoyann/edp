import "@/styles/dist.css";


export default function App({ Component, pageProps }) {
  return (
    <div className="bg-gray-300 min-h-screen flex flex-col items-center w-full mx-auto">
      <Component {...pageProps} />
    </div>
  );
}
