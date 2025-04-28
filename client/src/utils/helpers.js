/**
 * Format a value based on its type for display in the UI
 */
export const formatValue = (value, type) => {
  if (value === null || value === undefined) {
    return '(null)';
  }

  if (type === 'datetime' || type === 'timestamp') {
    return new Date(value).toLocaleString();
  }

  if (type === 'date') {
    return new Date(value).toLocaleDateString();
  }

  if (type === 'time') {
    return value;
  }

  if (typeof value === 'object') {
    return JSON.stringify(value);
  }

  return String(value);
};

/**
 * Get the appropriate editor type for a MySQL column type
 */
export const getEditorType = (columnType) => {
  const type = columnType.toLowerCase();

  if (type.includes('int')) {
    return 'number';
  }

  if (type.includes('decimal') || type.includes('float') || type.includes('double')) {
    return 'number';
  }

  if (type.includes('date') && !type.includes('datetime')) {
    return 'date';
  }

  if (type.includes('datetime') || type.includes('timestamp')) {
    return 'datetime-local';
  }

  if (type.includes('time') && !type.includes('timestamp')) {
    return 'time';
  }

  if (type.includes('text') || type.includes('blob')) {
    return 'textarea';
  }

  if (type.includes('enum') || type.includes('set')) {
    // Extract options from enum/set type, e.g., "enum('a','b','c')" -> ['a', 'b', 'c']
    const match = type.match(/enum\('(.+?)'\)/i) || type.match(/set\('(.+?)'\)/i);
    if (match) {
      const options = match[1].split("','");
      return {
        type: 'select',
        options,
      };
    }
  }

  return 'text';
};

/**
 * Parse a MySQL column type to get its base type
 */
export const parseColumnType = (fullType) => {
  // Extract the base type (e.g., "varchar(255)" -> "varchar")
  const match = fullType.match(/^([a-z]+)/i);
  return match ? match[1].toLowerCase() : fullType.toLowerCase();
};

/**
 * Convert a value to the appropriate type for a MySQL column
 */
export const convertValueForColumn = (value, columnType) => {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  const type = columnType.toLowerCase();

  if (type.includes('int')) {
    return parseInt(value, 10);
  }

  if (type.includes('decimal') || type.includes('float') || type.includes('double')) {
    return parseFloat(value);
  }

  if (type.includes('date') || type.includes('time')) {
    return value; // Let MySQL handle the date/time formatting
  }

  return value;
};
