import {useContext, useEffect, useState} from "react";
import {differenceInCalendarDays} from "date-fns";
import axios from "axios";
import {Navigate} from "react-router-dom";
import {UserContext} from "./UserContext.jsx";
import { validateDate, validatePhoneNumber, validateName } from './utils/validation.js'

export default function BookingWidget({place}) {
  const [checkIn,setCheckIn] = useState('');
  const [checkOut,setCheckOut] = useState('');
  const [numberOfGuests,setNumberOfGuests] = useState(1);
  const [name,setName] = useState('');
  const [phone,setPhone] = useState('');
  const [redirect,setRedirect] = useState('');
  const [formErrors,setFormErrors] = useState({});
  const {user} = useContext(UserContext);

  useEffect(() => {
    if (user) {
      setName(user.name);
    }
  }, [user]);

  let numberOfNights = 0;
  if (checkIn && checkOut) {
    numberOfNights = differenceInCalendarDays(new Date(checkOut), new Date(checkIn));
  }

  // Función para validar el formulario
  const validateForm = () => {
    const errors = {};

    if (!validateDate(checkIn) || !validateDate(checkOut)) {
      errors.date = 'Por favor, selecciona fechas válidas.';
    }

    if (numberOfGuests < 1) {
      errors.guests = 'Número de invitados debe ser al menos 1.';
    }

    if (!validateName(name)) {
      errors.name = 'Por favor, ingresa un nombre válido.';
    }

    if (!validatePhoneNumber(phone)) {
      errors.phone = 'Por favor, ingresa un número de teléfono válido.';
    }

    return errors; // Devuelve true si no hay errores
  };

  async function bookThisPlace() {

    const errors = validateForm();
    
    if (Object.keys(errors).length != 0) {
      setFormErrors(errors);
      return;
    }

    const response = await axios.post('/bookings', {
      checkIn,checkOut,numberOfGuests,name,phone,
      place:place._id,
      price:numberOfNights * place.price,
    });
    const bookingId = response.data._id;
    setRedirect(`/account/bookings/${bookingId}`);
  }

  if (redirect) {
    return <Navigate to={redirect} />
  }

  return (
    <div className="bg-white shadow p-4 rounded-2xl">
      <div className="text-2xl text-center">
        Price: ${place.price} / per night
      </div>
      <div className="border rounded-2xl mt-4">
        <div className="flex">
          <div className="py-3 px-4">
            <label>Check in:</label>
            <input type="date"
                   value={checkIn}
                   onChange={ev => setCheckIn(ev.target.value)}/>
          </div>
          <div className="py-3 px-4 border-l">
            <label>Check out:</label>
            <input type="date" value={checkOut}
                   onChange={ev => setCheckOut(ev.target.value)}/>
          </div>
        </div>
        <div className="py-3 px-4 border-t">
          <label>Number of guests:</label>
          <input type="number"
                 value={numberOfGuests}
                 onChange={ev => setNumberOfGuests(ev.target.value)}/>
          {formErrors.guests && (<p>{formErrors.guests}</p>)}
        </div>
        {numberOfNights > 0 && (
          <div className="py-3 px-4 border-t">
            <label>Your full name:</label>
            <input type="text"
                   value={name}
                   onChange={ev => setName(ev.target.value)}/>
            {formErrors.name && (<p>{formErrors.name}</p>)}
            <label>Phone number:</label>
            <input type="tel"
                   value={phone}
                   onChange={ev => setPhone(ev.target.value)}/>
            {formErrors.phone && (<p>{formErrors.phone}</p>)}       
          </div>
        )}
      </div>
      <button onClick={bookThisPlace} className="primary mt-4">
        Book this place
        {numberOfNights > 0 && (
          <span> ${numberOfNights * place.price}</span>
        )}
      </button>
    </div>
  );
}