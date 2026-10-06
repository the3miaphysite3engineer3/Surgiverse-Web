import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardMedia,
  CardContent,
  Chip,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  Button,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import DownloadIcon from '@mui/icons-material/Download';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera';
import { formatAttemptDate, screenshotSrc, screenshotFilename, getAttemptScreenshots } from '../utils/attemptFormat';
import { resolveScreenshotList, needsSigning, isSignerConfigured } from '../utils/r2screenshots';

const AttemptScreenshots = ({ screenshots, attempt }) => {
  const [lightboxIndex, setLightboxIndex] = useState(null);
  const [failedImages, setFailedImages] = useState({});

  const rawList = Array.isArray(screenshots)
    ? screenshots
    : attempt?.screenshots;
  // Always normalize through the helper so R2 (`url`) and legacy
  // base64 (`image`) entries are both accepted and junk is dropped.
  const list = getAttemptScreenshots({ screenshots: rawList });

  const markFailed = (i) => setFailedImages((prev) => (prev[i] ? prev : { ...prev, [i]: true }));

  // Resolve viewable URLs. Base64/public entries resolve synchronously;
  // private R2 entries are upgraded to short-lived signed URLs via the
  // signer (see worker/README.md) when VITE_R2_SIGNER_URL is configured.
  // `listSig` re-runs resolution only when the screenshot set changes.
  const listSig = useMemo(
    () =>
      list
        .map((s) =>
          typeof s === 'string' ? s : s?.r2Key || s?.url || s?.image || ''
        )
        .join('|'),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [screenshots, attempt]
  );
  const [resolved, setResolved] = useState(() =>
    list.map((s) => screenshotSrc(s))
  );
  const [signing, setSigning] = useState(
    () => isSignerConfigured() && list.some((s) => needsSigning(s))
  );
  useEffect(() => {
    let cancelled = false;
    setResolved(list.map((s) => screenshotSrc(s)));
    setSigning(isSignerConfigured() && list.some((s) => needsSigning(s)));
    resolveScreenshotList(list).then((srcs) => {
      if (cancelled) return;
      setResolved(srcs);
      setSigning(false);
      // A signed URL may succeed where the unsigned endpoint failed —
      // let those thumbnails retry instead of sticking on the fallback.
      setFailedImages((prev) => {
        const next = { ...prev };
        let changed = false;
        srcs.forEach((s, i) => {
          if (next[i] && s && s !== screenshotSrc(list[i])) {
            delete next[i];
            changed = true;
          }
        });
        return changed ? next : prev;
      });
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listSig]);
  const srcAt = (i) => resolved[i] ?? screenshotSrc(list[i]);
  if (list.length === 0) {
    return (
      <Box sx={{ mt: 2, display: 'flex', alignItems: 'center', gap: 1, color: 'text.secondary' }}>
        <PhotoCameraIcon fontSize="small" />
        <Typography variant="body2">No screenshots captured for this attempt.</Typography>
      </Box>
    );
  }

  const openAt = (i) => setLightboxIndex(i);
  const close = () => setLightboxIndex(null);
  const step = (dir) =>
    setLightboxIndex((prev) => (prev === null ? prev : (prev + dir + list.length) % list.length));

  const handleDownload = async (index) => {
    const entry = list[index];
    const src = srcAt(index);
    if (!src) return;
    const filename = screenshotFilename(entry, index);
    // Data URLs / same-origin: direct download works.
    if (src.startsWith('data:') || src.startsWith('blob:')) {
      const a = document.createElement('a');
      a.href = src;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      return;
    }
    // Cross-origin (R2) URLs: the `download` attribute is ignored, so fetch
    // to a blob first; fall back to opening the original in a new tab.
    try {
      const res = await fetch(src, { mode: 'cors' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = objectUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(objectUrl), 5000);
    } catch {
      window.open(src, '_blank', 'noopener,noreferrer');
    }
  };

  const active = lightboxIndex !== null ? list[lightboxIndex] : null;

  return (
    <Box sx={{ mt: 2 }}>
      <Typography variant="subtitle2" sx={{ mb: 1.5 }} color="text.secondary">
        {list.length} screenshot{list.length === 1 ? '' : 's'} captured — click to enlarge
      </Typography>
      <Grid container spacing={2}>
        {list.map((shot, i) => {
          const src = srcAt(i);
          const pending = signing && needsSigning(shot) && !failedImages[i];
          const source = typeof shot === 'object' ? shot.source : undefined;
          const ts = typeof shot === 'object' ? shot.timestamp : undefined;
          return (
            <Grid item xs={12} sm={6} md={4} key={i}>
              <Card
                sx={{ cursor: 'pointer', '&:hover': { boxShadow: 6 } }}
                onClick={() => openAt(i)}
              >
                {src && !failedImages[i] && !pending ? (
                  <CardMedia
                    component="img"
                    image={src}
                    alt={`Attempt screenshot ${i + 1}`}
                    loading="lazy"
                    onError={() => markFailed(i)}
                    sx={{ height: 180, objectFit: 'cover', backgroundColor: '#000' }}
                  />
                ) : (
                  <Box sx={{ height: 180, display: 'flex', flexDirection: 'column', gap: 1, alignItems: 'center', justifyContent: 'center', p: 2, textAlign: 'center' }}>
                    <Typography variant="body2" color="text.secondary">
                      {pending
                        ? 'Loading secure image…'
                        : src
                          ? 'Could not load image (storage access?)'
                          : 'Image unavailable'}
                    </Typography>
                    {src && !pending && (
                      <Button
                        size="small"
                        variant="outlined"
                        href={src}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                      >
                        Open original
                      </Button>
                    )}
                  </Box>
                )}
                <CardContent sx={{ py: 1, display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
                  <Typography variant="body2" fontWeight={600}>#{i + 1}</Typography>
                  {source && <Chip label={source} size="small" variant="outlined" />}
                  {ts && (
                    <Typography variant="caption" color="text.secondary">
                      {formatAttemptDate(ts)}
                    </Typography>
                  )}
                </CardContent>
              </Card>
            </Grid>
          );
        })}
      </Grid>

      <Dialog open={lightboxIndex !== null} onClose={close} maxWidth="lg" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pr: 1 }}>
          <span>
            Screenshot {(lightboxIndex ?? 0) + 1} of {list.length}
            {active && typeof active === 'object' && active.source ? ` — ${active.source}` : ''}
          </span>
          <Box>
            <IconButton onClick={() => handleDownload(lightboxIndex)} aria-label="Download screenshot">
              <DownloadIcon />
            </IconButton>
            <IconButton onClick={close} aria-label="Close viewer">
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1, backgroundColor: '#111', minHeight: 300 }}>
          <IconButton onClick={() => step(-1)} sx={{ color: '#fff' }} aria-label="Previous screenshot">
            <ChevronLeftIcon fontSize="large" />
          </IconButton>
          {active && (
            <Box sx={{ flex: 1, textAlign: 'center' }}>
              {!failedImages[lightboxIndex] ? (
                <Box
                  component="img"
                  src={srcAt(lightboxIndex)}
                  alt={`Screenshot ${(lightboxIndex ?? 0) + 1} enlarged`}
                  onError={() => markFailed(lightboxIndex)}
                  sx={{ maxWidth: '100%', maxHeight: '70vh', objectFit: 'contain', borderRadius: 1 }}
                />
              ) : (
                <Box sx={{ py: 6 }}>
                  <Typography variant="body2" sx={{ color: '#ccc', mb: 2 }}>
                    Could not load this image. The storage URL may require access permission.
                  </Typography>
                  <Button variant="outlined" href={srcAt(lightboxIndex)} target="_blank" rel="noopener noreferrer">
                    Open original in new tab
                  </Button>
                </Box>
              )}
              {typeof active === 'object' && active.timestamp && (
                <Typography variant="caption" sx={{ display: 'block', mt: 1, color: '#ccc' }}>
                  {formatAttemptDate(active.timestamp)}
                </Typography>
              )}
            </Box>
          )}
          <IconButton onClick={() => step(1)} sx={{ color: '#fff' }} aria-label="Next screenshot">
            <ChevronRightIcon fontSize="large" />
          </IconButton>
        </DialogContent>
        <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center', p: 1.5, flexWrap: 'wrap' }}>
          {list.map((shot, i) => (
            <Button
              key={i}
              size="small"
              variant={i === lightboxIndex ? 'contained' : 'outlined'}
              onClick={() => setLightboxIndex(i)}
            >
              {i + 1}
            </Button>
          ))}
        </Box>
      </Dialog>
    </Box>
  );
};

export default AttemptScreenshots;
