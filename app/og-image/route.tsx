import { ImageResponse } from 'next/og';

/**
 * The social sharing card, served as a real PNG at /og-image.
 *
 * Facebook, WhatsApp, LinkedIn and X all refuse SVG for `og:image`, so the
 * previous /images/og-default.svg produced a link with no preview. This
 * renders the same artwork through next/og instead.
 */
export const runtime = 'nodejs';
export const dynamic = 'force-static';

const SIZE = { width: 1200, height: 630 };

export function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundImage: 'linear-gradient(135deg, #163326 0%, #2a6145 100%)',
          color: '#eee8dc',
          fontFamily: 'serif',
          position: 'relative',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: 76,
            right: 156,
            width: 202,
            height: 202,
            borderRadius: 202,
            border: '2px solid rgba(238, 232, 220, 0.28)',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: 95,
            left: 177,
            width: 126,
            height: 126,
            borderRadius: 126,
            border: '2px solid rgba(238, 232, 220, 0.28)',
          }}
        />

        <div style={{ display: 'flex', fontSize: 84, fontWeight: 700, letterSpacing: -1 }}>Roti Ghar</div>
        <div style={{ display: 'flex', marginTop: 18, fontSize: 36, opacity: 0.78 }}>
          No neighbour left hungry
        </div>
        <div
          style={{
            display: 'flex',
            marginTop: 46,
            paddingTop: 24,
            fontSize: 27,
            letterSpacing: 6,
            textTransform: 'uppercase',
            opacity: 0.62,
            borderTop: '1px solid rgba(238, 232, 220, 0.3)',
          }}
        >
          workrotighar.com
        </div>
      </div>
    ),
    SIZE,
  );
}
