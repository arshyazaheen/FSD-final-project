import {
  getTrustedContacts,
  addTrustedContact,
  updateTrustedContact,
  removeTrustedContact,
} from '../services/trustedContactService.js';

export async function list(req, res, next) {
  try {
    const contacts = await getTrustedContacts({ userId: req.user._id });
    res.json({
      success: true,
      contacts,
    });
  } catch (error) {
    next(error);
  }
}

export async function add(req, res, next) {
  try {
    const { contactName, contactEmail, phone, relationship, permissions, securityNote } = req.body;

    if (!contactName || !contactEmail) {
      return res.status(400).json({
        success: false,
        error: 'Contact name and email are required',
      });
    }

    const result = await addTrustedContact({
      userId: req.user._id,
      contactData: { contactName, contactEmail, phone, relationship, permissions, securityNote },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'] || 'Unknown',
    });

    res.status(201).json({
      success: true,
      message: 'Trusted contact added and invitation generated successfully',
      ...result,
    });
  } catch (error) {
    next(error);
  }
}

export async function update(req, res, next) {
  try {
    const contact = await updateTrustedContact({
      contactId: req.params.id,
      userId: req.user._id,
      updateData: req.body,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'] || 'Unknown',
    });

    res.json({
      success: true,
      message: 'Trusted contact updated successfully',
      contact,
    });
  } catch (error) {
    next(error);
  }
}

export async function remove(req, res, next) {
  try {
    const result = await removeTrustedContact({
      contactId: req.params.id,
      userId: req.user._id,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'] || 'Unknown',
    });

    res.json({
      success: true,
      ...result,
    });
  } catch (error) {
    next(error);
  }
}

