import { test } from '@wordpress/e2e-test-utils-playwright';
import { camelCaseDashes } from '../utils';

const results: Record< string, number[] > = {};

test.describe( 'Frontend Tests', () => {
	test.use( {
		storageState: {}, // User will be logged out.
	} );

	// Run *once* before *all* iterations.
	// Ideal for setting up the site for this particular test.
	test.beforeAll( async ( { requestUtils } ) => {
		await requestUtils.activateTheme( 'twentytwentyone' );
		await requestUtils.request.get(
			`${ requestUtils.baseURL }/?reset_helper`
		);
	} );

	// After all results are processed, attach results for further processing.
	// For easier handling, only one attachment per file.
	test.afterAll( async ( {}, testInfo ) => {
		await testInfo.attach( 'results', {
			body: JSON.stringify( results, null, 2 ),
			contentType: 'application/json',
		} );
	} );

	const iterations = Number( process.env.TEST_ITERATIONS );
	for ( let i = 1; i <= iterations; i++ ) {
		test( `Measure load time metrics (${ i } of ${ iterations })`, async ( {
			page,
			metrics,
		} ) => {
			await page.goto( `/?i=${ i }` );

			const serverTiming = await metrics.getServerTiming();

			for ( const [ key, value ] of Object.entries( serverTiming ) ) {
				results[ camelCaseDashes( key ) ] ??= [];
				results[ camelCaseDashes( key ) ].push( value );
			}

			const ttfb = await metrics.getTimeToFirstByte();
			const lcp = await metrics.getLargestContentfulPaint();

			results.largestContentfulPaint ??= [];
			results.largestContentfulPaint.push( lcp );
			results.timeToFirstByte ??= [];
			results.timeToFirstByte.push( ttfb );
			results.lcpMinusTtfb ??= [];
			results.lcpMinusTtfb.push( lcp - ttfb );
		} );
	}
} );
