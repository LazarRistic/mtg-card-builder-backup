# MTG Card Builder Backup

A Chrome extension that adds backup and restore functionality to [MTG Card Builder](https://mtgcardbuilder.com/creator/), allowing you to save your custom card designs as JSON files and reload them later to continue editing.

## Features

- **Download JSON**: Export your current card design as a JSON file with automatic naming based on the card name
- **Load JSON**: Import a previously saved JSON file to restore your card design
- **Seamless Integration**: Buttons blend naturally with the existing MTG Card Builder interface
- **No Data Collection**: All data stays on your computer - nothing is sent to external servers

## Installation

### From Chrome Web Store
1. Visit the [Chrome Web Store listing](#) *(add link when published)*
2. Click "Add to Chrome"
3. Navigate to [mtgcardbuilder.com/creator](https://mtgcardbuilder.com/creator/)
4. You'll see two new buttons added to the action toolbar

### Manual Installation (Developer Mode)
1. Download or clone this repository
2. Open Chrome and go to `chrome://extensions/`
3. Enable "Developer mode" in the top right
4. Click "Load unpacked"
5. Select the extension folder containing `manifest.json`

## Usage

### Downloading (Backing Up) Your Card
1. Design your card on [MTG Card Builder](https://mtgcardbuilder.com/creator/)
2. Click the **Backup card** button (4th button in the toolbar)
3. Your card design will be saved as `[cardname].json` to your downloads folder

### Loading (Restoring) Your Card
1. Click the **Restore card** button (5th button in the toolbar)
2. Select your previously saved `.json` file
3. Your card design will be instantly restored

## Files Structure

```
mtg-card-builder-backup/
├── manifest.json        # Extension configuration
├── content.js           # Main content script
├── injected.js          # Page context script
├── backup.png           # Download button icon
├── restore.png          # Load button icon
├── icon16.png           # Extension icon (16x16)
├── icon48.png           # Extension icon (48x48)
└── icon128.png          # Extension icon (128x128)
```

## How It Works

The extension:
1. Injects two custom buttons into the MTG Card Builder interface
2. Reads from and writes to the website's `localStorage` where card data is stored
3. Uses the website's native `getCardName()` and `loadCard()` functions for seamless integration
4. Handles file downloads and uploads entirely on your local machine

## Privacy

This extension does **not**:
- Collect any user data
- Send data to external servers
- Track your usage
- Require any special permissions beyond accessing mtgcardbuilder.com

See [PRIVACY.md](PRIVACY.md) for full privacy policy.

## Development

### Building
No build process required - this is a pure JavaScript extension.

### Testing
1. Make changes to the code
2. Go to `chrome://extensions/`
3. Click the reload icon on the extension card
4. Refresh mtgcardbuilder.com to see changes

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

If you encounter any issues or have suggestions:
- Open an issue on [GitHub Issues](#)
- Or contact [your email/contact method]

## Acknowledgments

- Thanks to [MTG Card Builder](https://mtgcardbuilder.com) for the awesome card creation tool
- Inspired by the need to preserve custom card designs without losing work

---

**Note**: This extension is not affiliated with or endorsed by MTG Card Builder or Wizards of the Coast.