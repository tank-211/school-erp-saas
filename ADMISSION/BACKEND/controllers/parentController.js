import prisma from '../src/lib/prisma.js';

// Get parent by ID
export const getParentById = async (req, res) => {
  const { id } = req.params;

  try {
    const parent = await prisma.parent_detail.findUnique({
      where: {
        id: BigInt(id)
      }
    });

    if (!parent) {
      return res.status(404).json({
        success: false,
        message: 'Parent not found'
      });
    }

    res.status(200).json({
      success: true,
      data: parent
    });
  } catch (error) {
    console.error('Error fetching parent:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching parent',
      error: error.message
    });
  }
};

// Save parent information
export const saveParent = async (req, res) => {
  const {
    school_id,
    student_id,
    relation,
    first_name,
    last_name,
    email,
    phone,
    occupation
  } = req.body;

  try {
    const existingParent =
      await prisma.parent_detail.findFirst({
        where: {
          student_id: BigInt(student_id),
          relation: relation || 'Father'
        }
      });

    let parent;

    if (existingParent) {
      parent =
        await prisma.parent_detail.update({
          where: {
            id: existingParent.id
          },
          data: {
            first_name,
            last_name,
            email,
            phone,
            occupation,
            updated_at: new Date()
          }
        });
    } else {
      parent =
        await prisma.parent_detail.create({
          data: {
            school_id: BigInt(school_id),
            student_id: BigInt(student_id),
            relation: relation || 'Father',
            first_name,
            last_name,
            email,
            phone,
            occupation
          }
        });
    }

    res.status(200).json({
      success: true,
      message: 'Parent information saved successfully',
      data: parent
    });
  } catch (error) {
    console.error('Error saving parent:', error);
    res.status(500).json({
      success: false,
      message: 'Error saving parent',
      error: error.message
    });
  }
};