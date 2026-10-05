class SelectedFile {
  final String name;
  final String? path;
  final List<int>? bytes;
  final int? size;

  const SelectedFile({
    required this.name,
    this.path,
    this.bytes,
    this.size,
  });

  bool get hasContent =>
      (path != null && path!.isNotEmpty) ||
      (bytes != null && bytes!.isNotEmpty);
}
