// @ts-check
const footerLinks = [
  'Audio Description',
  'Help Center',
  'Gift Cards',
  'Media Center',
  'Investor Relations',
  'Jobs',
  'Terms of Use',
  'Privacy',
  'Legal Notices',
  'Cookie Preferences',
  'Corporate Information',
  'Contact Us',
];

const Footer = () => {
  return (
    <footer className="mx-auto mt-16 max-w-5xl px-8 py-12">
      <p className="mb-6 text-sm text-gray-400">Questions? Call 1-844-505-2993</p>
      <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
        {footerLinks.map((link) => (
          <a
            key={link}
            href="#"
            className="text-xs text-gray-400 underline transition-colors hover:text-gray-200"
          >
            {link}
          </a>
        ))}
      </div>
      <p className="text-xs text-gray-500">reel — Built for educational purposes.</p>
      <p className="mt-2 text-xs text-gray-600">
        Movie data provided by TMDB. This product uses the TMDB API but is not endorsed or certified
        by TMDB.
      </p>
    </footer>
  );
};

export default Footer;
