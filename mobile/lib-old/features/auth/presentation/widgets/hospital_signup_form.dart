import 'package:flutter/material.dart';
import '../../../../core/theme/app_colors.dart';
import 'file_upload_picker_box.dart';

class ProvinceDistricts {
  final String province;
  final List<String> districts;

  const ProvinceDistricts({required this.province, required this.districts});
}

class HospitalSignupForm extends StatefulWidget {
  final VoidCallback onSuccess;

  const HospitalSignupForm({super.key, required this.onSuccess});

  @override
  State<HospitalSignupForm> createState() => _HospitalSignupFormState();
}

class _HospitalSignupFormState extends State<HospitalSignupForm> {
  final _formKey = GlobalKey<FormState>();
  final _nameController = TextEditingController();
  final _regNoController = TextEditingController();
  final _emailController = TextEditingController();
  final _phoneController = TextEditingController();
  final _addressController = TextEditingController();
  final _passwordController = TextEditingController();
  final _confirmPasswordController = TextEditingController();

  static const List<ProvinceDistricts> slProvinces = [
    ProvinceDistricts(province: 'Western Province', districts: ['Colombo', 'Gampaha', 'Kalutara']),
    ProvinceDistricts(province: 'Central Province', districts: ['Kandy', 'Matale', 'Nuwara Eliya']),
    ProvinceDistricts(province: 'Southern Province', districts: ['Galle', 'Matara', 'Hambantota']),
    ProvinceDistricts(province: 'Northern Province', districts: ['Jaffna', 'Kilinochchi', 'Mannar', 'Vavuniya', 'Mullaitivu']),
    ProvinceDistricts(province: 'Eastern Province', districts: ['Batticaloa', 'Ampara', 'Trincomalee']),
    ProvinceDistricts(province: 'North Western Province', districts: ['Kurunegala', 'Puttalam']),
    ProvinceDistricts(province: 'North Central Province', districts: ['Anuradhapura', 'Polonnaruwa']),
    ProvinceDistricts(province: 'Uva Province', districts: ['Badulla', 'Monaragala']),
    ProvinceDistricts(province: 'Sabaragamuwa Province', districts: ['Ratnapura', 'Kegalle']),
  ];

  String _hospitalType = 'Government';
  String _operatingHoursType = '24hrs';
  String? _selectedProvince = 'Western Province';
  String? _selectedDistrict = 'Colombo';

  String? _regProofName;
  String? _addrProofName;

  bool _showPassword = false;
  bool _showConfirmPassword = false;
  bool _isLoading = false;
  String? _errorMessage;

  @override
  void dispose() {
    _nameController.dispose();
    _regNoController.dispose();
    _emailController.dispose();
    _phoneController.dispose();
    _addressController.dispose();
    _passwordController.dispose();
    _confirmPasswordController.dispose();
    super.dispose();
  }

  List<String> get _currentDistricts {
    final match = slProvinces.firstWhere(
      (p) => p.province == _selectedProvince,
      orElse: () => slProvinces.first,
    );
    return match.districts;
  }

  void _handleSubmit() {
    setState(() => _errorMessage = null);

    if (!(_formKey.currentState?.validate() ?? false)) {
      return;
    }

    if (_regProofName == null || _regProofName!.isEmpty) {
      setState(() => _errorMessage = 'Please upload Proof of Registration');
      return;
    }

    if (_passwordController.text != _confirmPasswordController.text) {
      setState(() => _errorMessage = 'Passwords do not match');
      return;
    }

    if (_passwordController.text.length < 6) {
      setState(() => _errorMessage = 'Password must be at least 6 characters');
      return;
    }

    setState(() => _isLoading = true);

    Future.delayed(const Duration(milliseconds: 1200), () {
      if (mounted) {
        setState(() => _isLoading = false);
        widget.onSuccess();
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    return Form(
      key: _formKey,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          if (_errorMessage != null) ...[
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
              decoration: BoxDecoration(
                color: AppColors.errorBg,
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: AppColors.error.withValues(alpha: 0.3)),
              ),
              child: Text(
                _errorMessage!,
                style: const TextStyle(
                  color: AppColors.error,
                  fontSize: 13,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ),
            const SizedBox(height: 12),
          ],

          // Hospital Logo
          const FileUploadPickerBox(
            label: 'Hospital / Facility Logo (Optional)',
            placeholder: 'Upload Hospital Brand Logo',
          ),
          const SizedBox(height: 12),

          // Hospital Name
          TextFormField(
            controller: _nameController,
            decoration: const InputDecoration(
              hintText: 'Official Hospital / Clinic Name *',
            ),
            validator: (v) => (v == null || v.trim().isEmpty) ? 'Please enter hospital name' : null,
          ),
          const SizedBox(height: 12),

          // Reg No
          TextFormField(
            controller: _regNoController,
            decoration: const InputDecoration(
              hintText: 'Registration / MOH License Number *',
            ),
            validator: (v) => (v == null || v.trim().isEmpty) ? 'Please enter license number' : null,
          ),
          const SizedBox(height: 12),

          // Hospital Type (Dropdown)
          DropdownButtonFormField<String>(
            initialValue: _hospitalType,
            decoration: const InputDecoration(
              hintText: 'Hospital Type *',
            ),
            dropdownColor: Colors.white,
            items: const [
              DropdownMenuItem(value: 'Government', child: Text('Government Hospital / Center')),
              DropdownMenuItem(value: 'Private', child: Text('Private Hospital / Clinic')),
            ],
            onChanged: (v) => setState(() => _hospitalType = v ?? 'Government'),
          ),
          const SizedBox(height: 12),

          // Operating Hours Type
          DropdownButtonFormField<String>(
            initialValue: _operatingHoursType,
            decoration: const InputDecoration(
              hintText: 'Operating Hours *',
            ),
            dropdownColor: Colors.white,
            items: const [
              DropdownMenuItem(value: '24hrs', child: Text('Open 24 Hours')),
              DropdownMenuItem(value: 'custom', child: Text('Day Shifts (08:00 - 18:00)')),
            ],
            onChanged: (v) => setState(() => _operatingHoursType = v ?? '24hrs'),
          ),
          const SizedBox(height: 12),

          // Official Email
          TextFormField(
            controller: _emailController,
            keyboardType: TextInputType.emailAddress,
            decoration: const InputDecoration(
              hintText: 'Official Hospital Email *',
            ),
            validator: (v) {
              if (v == null || v.trim().isEmpty) return 'Please enter official email';
              if (!v.contains('@')) return 'Enter a valid email address';
              return null;
            },
          ),
          const SizedBox(height: 12),

          // Contact Number
          TextFormField(
            controller: _phoneController,
            keyboardType: TextInputType.phone,
            decoration: const InputDecoration(
              hintText: 'Hospital Hotline / Contact Number *',
            ),
            validator: (v) => (v == null || v.trim().isEmpty) ? 'Please enter contact number' : null,
          ),
          const SizedBox(height: 12),

          // Address
          TextFormField(
            controller: _addressController,
            decoration: const InputDecoration(
              hintText: 'Hospital Street Address *',
            ),
            validator: (v) => (v == null || v.trim().isEmpty) ? 'Please enter address' : null,
          ),
          const SizedBox(height: 12),

          // Province Dropdown
          DropdownButtonFormField<String>(
            initialValue: _selectedProvince,
            decoration: const InputDecoration(
              hintText: 'Province *',
            ),
            dropdownColor: Colors.white,
            items: slProvinces.map((p) {
              return DropdownMenuItem(value: p.province, child: Text(p.province));
            }).toList(),
            onChanged: (prov) {
              setState(() {
                _selectedProvince = prov;
                _selectedDistrict = _currentDistricts.first;
              });
            },
          ),
          const SizedBox(height: 12),

          // District Dropdown
          DropdownButtonFormField<String>(
            initialValue: _selectedDistrict,
            decoration: const InputDecoration(
              hintText: 'District *',
            ),
            dropdownColor: Colors.white,
            items: _currentDistricts.map((d) {
              return DropdownMenuItem(value: d, child: Text(d));
            }).toList(),
            onChanged: (d) => setState(() => _selectedDistrict = d),
          ),
          const SizedBox(height: 12),

          // Password
          TextFormField(
            controller: _passwordController,
            obscureText: !_showPassword,
            decoration: InputDecoration(
              hintText: 'Administrator Password (Min 6 characters) *',
              suffixIcon: IconButton(
                icon: Icon(
                  _showPassword ? Icons.visibility_off : Icons.visibility,
                  size: 20,
                  color: const Color(0xFF64748B),
                ),
                onPressed: () => setState(() => _showPassword = !_showPassword),
              ),
            ),
            validator: (v) {
              if (v == null || v.isEmpty) return 'Please enter password';
              if (v.length < 6) return 'Password must be at least 6 characters';
              return null;
            },
          ),
          const SizedBox(height: 12),

          // Confirm Password
          TextFormField(
            controller: _confirmPasswordController,
            obscureText: !_showConfirmPassword,
            decoration: InputDecoration(
              hintText: 'Confirm Password *',
              suffixIcon: IconButton(
                icon: Icon(
                  _showConfirmPassword ? Icons.visibility_off : Icons.visibility,
                  size: 20,
                  color: const Color(0xFF64748B),
                ),
                onPressed: () => setState(() => _showConfirmPassword = !_showConfirmPassword),
              ),
            ),
            validator: (v) {
              if (v == null || v.isEmpty) return 'Please confirm password';
              return null;
            },
          ),
          const SizedBox(height: 12),

          // Proof of Registration
          FileUploadPickerBox(
            label: 'Proof of Hospital Registration / License',
            placeholder: 'Upload Operating License (PDF/JPG)',
            isRequired: true,
            initialFileName: _regProofName,
            onFileSelected: (name) => setState(() => _regProofName = name),
          ),
          const SizedBox(height: 12),

          // Proof of Address
          FileUploadPickerBox(
            label: 'Proof of Address / Facility Document (Optional)',
            placeholder: 'Upload Utility Bill / Government Notice (PDF/JPG)',
            initialFileName: _addrProofName,
            onFileSelected: (name) => setState(() => _addrProofName = name),
          ),
          const SizedBox(height: 18),

          // Submit Button
          Container(
            decoration: BoxDecoration(
              gradient: AppColors.authButtonGradient,
              borderRadius: BorderRadius.circular(10),
              boxShadow: [
                BoxShadow(
                  color: const Color(0xFF174296).withValues(alpha: 0.35),
                  blurRadius: 10,
                  offset: const Offset(0, 4),
                ),
              ],
            ),
            child: ElevatedButton(
              onPressed: _isLoading ? null : _handleSubmit,
              style: ElevatedButton.styleFrom(
                backgroundColor: Colors.transparent,
                shadowColor: Colors.transparent,
                padding: const EdgeInsets.symmetric(vertical: 14),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(10),
                ),
              ),
              child: _isLoading
                  ? const SizedBox(
                      height: 20,
                      width: 20,
                      child: CircularProgressIndicator(
                        strokeWidth: 2,
                        valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                      ),
                    )
                  : const Text(
                      'Register Hospital',
                      style: TextStyle(
                        fontSize: 15,
                        fontWeight: FontWeight.w700,
                        color: Colors.white,
                      ),
                    ),
            ),
          ),
        ],
      ),
    );
  }
}
