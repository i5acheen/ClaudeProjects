/**
 * The app's name and the words used to describe it, in one place.
 * Change APP_NAME (or any line here) and every screen, tab title and
 * link preview follows.
 *
 * Not affected: the name of each book's folder in Google Drive
 * ("Memory Book – <child>", see lib/drive/folder.ts). The app finds
 * existing books by that name, so it stays as it is.
 */

export const APP_NAME = "Memory Book";

/** The main headline. */
export const TAGLINE = "Their little moments, your forever book.";

/** The words in the tagline drawn with a sunny marker stroke (leave empty for none). */
export const TAGLINE_HIGHLIGHT = "forever book";

/** A small line under the tagline. */
export const TAGLINE_HINGLISH = "Har pal, har pehli baar, ek kitaab mein.";

/** The paragraph under the headline on the home page. */
export const OVERVIEW =
  `${APP_NAME} is your child's memory journal, kept like a real book. Every first smile, first word and first Diwali, ` +
  "written in your own words and laid out on beautiful book pages. Add a photo, write a few lines, and watch your child's " +
  "story grow, page by page. Your memories stay safe in your own Google Drive, ready to print as a keepsake they'll treasure forever.";

/** For search results, link previews (WhatsApp, Instagram…) and the installed app. */
export const SHORT_DESCRIPTION = "A memory journal for parents: write your child's story, page by page.";

/** Browser tab title of the home page. */
export const SITE_TITLE = `${APP_NAME} — Their little moments, your forever book`;

/** The small line in the footer of public pages. */
export const FOOTER_LINE = `${APP_NAME} — Their little moments, your forever book.`;

/** Under the sign-in button. */
export const SIGN_IN_NOTE = "Your photos stay in your own Google Drive.";

/** The button on an empty book. */
export const FIRST_MEMORY_BUTTON = "Add your first memory";
