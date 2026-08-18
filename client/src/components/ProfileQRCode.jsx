import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { Copy, Download, QrCode } from 'lucide-react';

export default function ProfileQRCode({ shareUrl, variant = 'panel' }) {
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function generateQrCode() {
      if (!shareUrl) {
        setError('');
        setQrDataUrl('');
        return;
      }

      try {
        setError('');

        const dataUrl = await QRCode.toDataURL(shareUrl, {
          errorCorrectionLevel: 'M',
          margin: 2,
          width: 320
        });

        if (!cancelled) {
          setQrDataUrl(dataUrl);
        }
      } catch (generationError) {
        console.error('Failed to generate QR code:', generationError);

        if (!cancelled) {
          setError('Unable to generate the QR code.');
          setQrDataUrl('');
        }
      }
    }

    generateQrCode();

    return () => {
      cancelled = true;
    };
  }, [shareUrl]);

  const copyShareUrl = async () => {
    if (!shareUrl) return;

    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);

      window.setTimeout(() => {
        setCopied(false);
      }, 2000);
    } catch (copyError) {
      console.error('Failed to copy share URL:', copyError);
      setError('Unable to copy the share URL.');
    }
  };

  const downloadQrCode = () => {
    if (!qrDataUrl) return;

    const link = document.createElement('a');
    link.href = qrDataUrl;
    link.download = 'resume-qr-code.png';
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  if (variant === 'header') {
    return qrDataUrl ? (
      <figure className="resume-header-qr-code">
        <img src={qrDataUrl} alt="Scan to open this resume" width="96" height="96" />
        <figcaption>Scan to view online</figcaption>
      </figure>
    ) : null;
  }

  if (!shareUrl) {
    return (
      <section className="resume-qr-code">
        <div className="resume-qr-code__header">
          <QrCode size={20} />
          <div>
            <h3>Resume QR Code</h3>
            <p>Generate a share link first to create a QR code.</p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="resume-qr-code">
      <div className="resume-qr-code__header">
        <QrCode size={20} />

        <div>
          <h3>Resume QR Code</h3>
          <p>
            Scan this code to open the shared version of your resume.
          </p>
        </div>
      </div>

      {error ? (
        <p className="field-error" role="alert">
          {error}
        </p>
      ) : null}

      {qrDataUrl ? (
        <div className="resume-qr-code__content">
          <div className="resume-qr-code__image">
            <img
              src={qrDataUrl}
              alt="QR code for shared resume"
              width="320"
              height="320"
            />
          </div>

          <div className="resume-qr-code__actions">
            <button type="button" onClick={downloadQrCode}>
              <Download size={16} />
              <span>Download QR Code</span>
            </button>

            <button type="button" onClick={copyShareUrl}>
              <Copy size={16} />
              <span>{copied ? 'Copied!' : 'Copy Resume Link'}</span>
            </button>
          </div>
        </div>
      ) : null}

      <label className="resume-qr-code__url">
        <span>Resume share URL</span>
        <input
          value={shareUrl}
          readOnly
          onFocus={(event) => event.target.select()}
        />
      </label>
    </section>
  );
}
