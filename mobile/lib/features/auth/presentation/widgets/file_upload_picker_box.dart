import 'package:flutter/material.dart';
import '../../../../core/theme/app_colors.dart';

class FileUploadPickerBox extends StatefulWidget {
  final String label;
  final String placeholder;
  final bool isRequired;
  final String? initialFileName;
  final Function(String fileName)? onFileSelected;

  const FileUploadPickerBox({
    super.key,
    required this.label,
    required this.placeholder,
    this.isRequired = false,
    this.initialFileName,
    this.onFileSelected,
  });

  @override
  State<FileUploadPickerBox> createState() => _FileUploadPickerBoxState();
}

class _FileUploadPickerBoxState extends State<FileUploadPickerBox> {
  String? _selectedFileName;

  @override
  void initState() {
    super.initState();
    _selectedFileName = widget.initialFileName;
  }

  void _handlePickFile() {
    // Simulate mobile file picking UI
    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (context) {
        return SafeArea(
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Text(
                  widget.label,
                  style: const TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w700,
                    color: AppColors.textTitle,
                  ),
                ),
                const SizedBox(height: 12),
                ListTile(
                  leading: const Icon(Icons.photo_library, color: AppColors.brandBlue),
                  title: const Text('Choose from Photo Gallery'),
                  onTap: () {
                    final simulated = 'photo_${DateTime.now().millisecondsSinceEpoch}.jpg';
                    setState(() => _selectedFileName = simulated);
                    widget.onFileSelected?.call(simulated);
                    Navigator.pop(context);
                  },
                ),
                ListTile(
                  leading: const Icon(Icons.camera_alt, color: AppColors.brandBlue),
                  title: const Text('Take a Photo / Scan Document'),
                  onTap: () {
                    final simulated = 'camera_capture_${DateTime.now().millisecondsSinceEpoch}.jpg';
                    setState(() => _selectedFileName = simulated);
                    widget.onFileSelected?.call(simulated);
                    Navigator.pop(context);
                  },
                ),
                ListTile(
                  leading: const Icon(Icons.picture_as_pdf, color: AppColors.brandBlue),
                  title: const Text('Select PDF Document'),
                  onTap: () {
                    final simulated = 'document_${DateTime.now().millisecondsSinceEpoch}.pdf';
                    setState(() => _selectedFileName = simulated);
                    widget.onFileSelected?.call(simulated);
                    Navigator.pop(context);
                  },
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          '${widget.label} ${widget.isRequired ? '*' : ''}',
          style: const TextStyle(
            fontSize: 12,
            fontWeight: FontWeight.w600,
            color: Color(0xFF475569),
          ),
        ),
        const SizedBox(height: 5),
        InkWell(
          onTap: _handlePickFile,
          borderRadius: BorderRadius.circular(10),
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
            decoration: BoxDecoration(
              color: AppColors.inputAuthBg,
              borderRadius: BorderRadius.circular(10),
              border: Border.all(
                color: AppColors.borderAuthInput,
                width: 1.5,
              ),
            ),
            child: Row(
              children: [
                Icon(
                  _selectedFileName != null ? Icons.check_circle : Icons.upload_file,
                  size: 20,
                  color: _selectedFileName != null ? AppColors.success : const Color(0xFF554A78),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: Text(
                    _selectedFileName ?? widget.placeholder,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.w500,
                      color: _selectedFileName != null
                          ? AppColors.textTitle
                          : const Color(0xFF554A78),
                    ),
                  ),
                ),
                const SizedBox(width: 8),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(6),
                    border: Border.all(color: AppColors.borderAuthInput),
                  ),
                  child: const Text(
                    'Browse',
                    style: TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.w700,
                      color: Color(0xFF281966),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }
}
