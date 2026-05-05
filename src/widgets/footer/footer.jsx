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
      <p className="text-ink-muted mb-6 text-sm">Questions? Call 1-844-505-2993</p>
      <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
        {footerLinks.map((link) => (
          <a
            key={link}
            href="#"
            className="text-ink-muted hover:text-ink text-xs underline transition-colors"
          >
            {link}
          </a>
        ))}
      </div>
      <p className="text-ink-faint text-xs">reel — Built for educational purposes.</p>
      <p className="text-ink-faint mt-2 text-xs">
        Movie data provided by TMDB. This product uses the TMDB API but is not endorsed or certified
        by TMDB.
      </p>
    </footer>
  );
};

export default Footer;
