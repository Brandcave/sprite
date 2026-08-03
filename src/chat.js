import { nameOf } from './identity.js';

/*
  Talking to the other people in the room.

  The villagers and the players get the same text box on purpose — walking up to
  somebody, pressing Z and reading a name plate should feel identical whether
  the line behind it was written months ago or is being typed at this moment on
  another machine. The only difference the player ever sees is that one of them
  answers back.

  A conversation is not a session. Nothing is held open, nobody is "in a chat",
  and there is no state on the relay beyond who is in the room: a message is
  addressed, delivered, read, and answered or not. That means walking away is
  always allowed and never breaks anything — the worst case is a reply that
  arrives after you have wandered off, which opens the box again, which is
  exactly what being spoken to should do.
*/

export class Chat {
  constructor({ net, dialogue }) {
    this.net = net;
    this.dialogue = dialogue;
    this.waiting = [];

    net.onSay = (from, text) => this.waiting.push({ from, text });
  }

  /** Walk up to somebody and open the box to write them a line. */
  talkTo(id) {
    this.dialogue.ask(`to ${nameOf(id)}`, {
      onSend: (text) => this.net.say(id, text),
    });
  }

  /**
   * Somebody spoke. Their line types out under their name, and when it runs out
   * the box turns into the reply — unless the reader pressed escape, which is
   * how you decline to answer without a menu asking you whether you would like
   * to decline to answer.
   */
  hear({ from, text }) {
    this.dialogue.start(
      { name: nameOf(from), start: 'said', nodes: { said: { text } } },
      (why) => {
        if (why !== 'escape') {
          this.dialogue.ask(`to ${nameOf(from)}`, {
            onSend: (reply) => this.net.say(from, reply),
            keep: true,          // leave their line above the answer
          });
        }
      },
    );
  }

  /**
   * Deliver at most one queued message, and only into an empty screen. Being
   * yanked out of a conversation with a villager — or worse, out of a half
   * written reply — to be shown something else is the one thing this must not
   * do, so anything that lands while the box is busy simply waits its turn.
   */
  drain() {
    if (this.dialogue.active || !this.waiting.length) return;
    this.hear(this.waiting.shift());
  }
}
