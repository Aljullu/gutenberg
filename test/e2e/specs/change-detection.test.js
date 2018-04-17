/**
 * Internal dependencies
 */
import '../support/bootstrap';
import { newPost, newDesktopBrowserPage } from '../support/utils';

describe( 'Change detection', () => {
	let handleInterceptedRequest;

	beforeAll( async () => {
		await newDesktopBrowserPage();
	} );

	beforeEach( async () => {
		await newPost();
	} );

	const MOD_KEY = process.platform === 'darwin' ? 'Meta' : 'Control';

	async function assertIsDirty( isDirty ) {
		let hadDialog = false;

		function handleOnDialog( dialog ) {
			dialog.accept();
			hadDialog = true;
		}

		try {
			page.on( 'dialog', handleOnDialog );
			await page.reload();

			// Ensure whether it was expected that dialog was encountered.
			expect( hadDialog ).toBe( isDirty );
		} catch ( error ) {
			throw error;
		} finally {
			page.removeListener( 'dialog', handleOnDialog );
		}
	}

	async function interceptSave() {
		await page.setRequestInterception( true );

		handleInterceptedRequest = ( interceptedRequest ) => {
			if ( ! interceptedRequest.url().includes( '/wp/v2/posts' ) ) {
				interceptedRequest.continue();
			}
		};
		page.on( 'request', handleInterceptedRequest );
	}

	async function releaseSaveIntercept() {
		page.removeListener( 'request', handleInterceptedRequest );
		await page.setRequestInterception( false );
	}

	it( 'Should not prompt to confirm unsaved changes', async () => {
		await assertIsDirty( false );
	} );

	it( 'Should prompt if property changed without save', async () => {
		await page.type( '.editor-post-title__input', 'Hello World' );

		await assertIsDirty( true );
	} );

	it( 'Should prompt if content added without save', async () => {
		await page.click( '.editor-default-block-appender' );

		await assertIsDirty( true );
	} );

	it( 'Should not prompt if changes saved', async () => {
		await page.type( '.editor-post-title__input', 'Hello World' );

		await Promise.all( [
			// Wait for "Saved" to confirm save complete.
			page.waitForSelector( '.editor-post-saved-state.is-saved' ),

			// Keyboard shortcut Ctrl+S save.
			page.keyboard.down( MOD_KEY ),
			page.keyboard.press( 'S' ),
			page.keyboard.up( MOD_KEY ),
		] );

		await assertIsDirty( false );
	} );

	it( 'Should prompt if save failed', async () => {
		await page.type( '.editor-post-title__input', 'Hello World' );

		await page.setOfflineMode( true );

		// Keyboard shortcut Ctrl+S save.
		await page.keyboard.down( MOD_KEY );
		await page.keyboard.press( 'S' );
		await page.keyboard.up( MOD_KEY );

		// Ensure save update fails and presents button.
		await page.waitForXPath( '//p[contains(text(), \'Updating failed\')]' );
		await page.waitForSelector( '.editor-post-save-draft' );

		// Need to disable offline to allow reload.
		await page.setOfflineMode( false );

		await assertIsDirty( true );
	} );

	it( 'Should prompt if changes and save is in-flight', async () => {
		await page.type( '.editor-post-title__input', 'Hello World' );

		// Hold the posts request so we don't deal with race conditions of the
		// save completing early. Other requests should be allowed to continue,
		// for example the page reload test.
		await interceptSave();

		// Keyboard shortcut Ctrl+S save.
		await page.keyboard.down( MOD_KEY );
		await page.keyboard.press( 'S' );
		await page.keyboard.up( MOD_KEY );

		await releaseSaveIntercept();

		await assertIsDirty( true );
	} );

	it( 'Should prompt if changes made while save is in-flight', async () => {
		await page.type( '.editor-post-title__input', 'Hello World' );

		// Hold the posts request so we don't deal with race conditions of the
		// save completing early. Other requests should be allowed to continue,
		// for example the page reload test.
		await interceptSave();

		// Keyboard shortcut Ctrl+S save.
		await page.keyboard.down( MOD_KEY );
		await page.keyboard.press( 'S' );
		await page.keyboard.up( MOD_KEY );

		await page.type( '.editor-post-title__input', '!' );

		await releaseSaveIntercept();

		await assertIsDirty( true );
	} );

	it( 'Should prompt if property changes made while save is in-flight, and save completes', async () => {
		await page.type( '.editor-post-title__input', 'Hello World' );

		// Hold the posts request so we don't deal with race conditions of the
		// save completing early.
		await interceptSave();

		// Keyboard shortcut Ctrl+S save.
		await page.keyboard.down( MOD_KEY );
		await page.keyboard.press( 'S' );
		await page.keyboard.up( MOD_KEY );

		// Dirty post while save is in-flight.
		await page.type( '.editor-post-title__input', '!' );

		// Allow save to complete. Disabling interception flushes pending.
		await Promise.all( [
			page.waitForSelector( '.editor-post-saved-state.is-saved' ),
			releaseSaveIntercept(),
		] );

		await assertIsDirty( true );
	} );

	it( 'Should prompt if block revision is made while save is in-flight, and save completes', async () => {
		await page.type( '.editor-post-title__input', 'Hello World' );

		// Hold the posts request so we don't deal with race conditions of the
		// save completing early.
		await interceptSave();

		// Keyboard shortcut Ctrl+S save.
		await page.keyboard.down( MOD_KEY );
		await page.keyboard.press( 'S' );
		await page.keyboard.up( MOD_KEY );

		await page.click( '.editor-default-block-appender' );

		// Allow save to complete. Disabling interception flushes pending.
		await Promise.all( [
			page.waitForSelector( '.editor-post-saved-state.is-saved' ),
			releaseSaveIntercept(),
		] );

		await assertIsDirty( true );
	} );
} );
