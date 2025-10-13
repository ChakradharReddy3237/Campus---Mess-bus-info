// Email integration service
// Supports Gmail API, Outlook Graph API, and generic IMAP

class EmailService {
  constructor(settings) {
    this.settings = settings;
    this.isAuthorized = false;
  }

  async authorize() {
    if (this.settings.provider === 'gmail') {
      return this.authorizeGmail();
    } else if (this.settings.provider === 'outlook') {
      return this.authorizeOutlook();
    }
    // IMAP doesn't need OAuth authorization
    this.isAuthorized = true;
    return true;
  }

  async authorizeGmail() {
    // Gmail OAuth2 flow
    try {
      // Using Google APIs client library
      const response = await window.gapi.load('auth2', () => {
        window.gapi.auth2.init({
          client_id: process.env.REACT_APP_GMAIL_CLIENT_ID,
          scope: 'https://www.googleapis.com/auth/gmail.readonly'
        });
      });
      
      const authInstance = window.gapi.auth2.getAuthInstance();
      await authInstance.signIn();
      this.isAuthorized = true;
      return true;
    } catch (error) {
      console.error('Gmail authorization failed:', error);
      return false;
    }
  }

  async authorizeOutlook() {
    // Microsoft Graph OAuth2 flow
    try {
      // Using MSAL.js
      const response = await window.msal.loginPopup({
        scopes: ['https://graph.microsoft.com/Mail.Read']
      });
      this.isAuthorized = true;
      return true;
    } catch (error) {
      console.error('Outlook authorization failed:', error);
      return false;
    }
  }

  async fetchLatestEmails() {
    if (!this.isAuthorized) {
      throw new Error('Not authorized');
    }

    if (this.settings.provider === 'gmail') {
      return this.fetchGmailEmails();
    } else if (this.settings.provider === 'outlook') {
      return this.fetchOutlookEmails();
    }
    
    return [];
  }

  async fetchGmailEmails() {
    try {
      const response = await window.gapi.client.gmail.users.messages.list({
        userId: 'me',
        q: `from:${this.settings.senderEmail}`,
        maxResults: 5
      });

      const messages = response.result.messages || [];
      const emailContents = [];

      for (const message of messages) {
        const details = await window.gapi.client.gmail.users.messages.get({
          userId: 'me',
          id: message.id
        });

        const content = this.extractEmailContent(details.result);
        if (content) {
          emailContents.push({
            id: message.id,
            date: new Date(parseInt(details.result.internalDate)),
            content: content
          });
        }
      }

      return emailContents;
    } catch (error) {
      console.error('Failed to fetch Gmail emails:', error);
      return [];
    }
  }

  async fetchOutlookEmails() {
    try {
      const response = await fetch('https://graph.microsoft.com/v1.0/me/messages', {
        headers: {
          'Authorization': `Bearer ${window.msal.getAccount().accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      const emails = data.value || [];

      return emails
        .filter(email => email.sender.emailAddress.address === this.settings.senderEmail)
        .slice(0, 5)
        .map(email => ({
          id: email.id,
          date: new Date(email.receivedDateTime),
          content: email.body.content
        }));
    } catch (error) {
      console.error('Failed to fetch Outlook emails:', error);
      return [];
    }
  }

  extractEmailContent(message) {
    // Extract text content from Gmail message
    const parts = message.payload.parts || [message.payload];
    
    for (const part of parts) {
      if (part.mimeType === 'text/plain' && part.body.data) {
        return atob(part.body.data.replace(/-/g, '+').replace(/_/g, '/'));
      }
    }
    
    return null;
  }

  // Check if we need to load external scripts
  static async loadRequiredScripts(provider) {
    if (provider === 'gmail' && !window.gapi) {
      return new Promise((resolve) => {
        const script = document.createElement('script');
        script.src = 'https://apis.google.com/js/api.js';
        script.onload = () => resolve();
        document.head.appendChild(script);
      });
    }
    
    if (provider === 'outlook' && !window.msal) {
      return new Promise((resolve) => {
        const script = document.createElement('script');
        script.src = 'https://alcdn.msauth.net/browser/2.14.2/js/msal-browser.min.js';
        script.onload = () => resolve();
        document.head.appendChild(script);
      });
    }
  }
}

export default EmailService;
