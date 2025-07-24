// src/composables/useEditable.ts
import axios from 'axios'
import { useAppStore } from '@/stores/app'

export function useEditable(type: 'user' | 'tutor' | 'admin') {
	const app = useAppStore()
	let originalEmail = ''

	async function save(entity: any) {
		if (!originalEmail) originalEmail = entity.email
		if (entity.email !== originalEmail) {
			await axios.post(`/api/accounts/changeEmail/${entity._id}`, { email: entity.email })
			originalEmail = entity.email
		}
		await axios.put(
			type === 'user'
				? `/api/users/user/${entity._id}`
				: type === 'tutor'
					? `/api/tutors/${entity._id}`
					: `/api/admins/${entity._id}`,
			{
				...entity,
				// flip the right “edit” flag:
				[type === 'user' ? 'editUsers' : type === 'tutor' ? 'editTutors' : 'editAdmins']:
					!entity[type === 'user' ? 'editUsers' : type === 'tutor' ? 'editTutors' : 'editAdmins'],
				saveEdit: entity.saveEdit === 'Edit' ? 'Save' : 'Edit'
			}
		)
		// update the store in place instead of re-fetching:
		if (type === 'user')      app.setCurrentUser(entity)
		else if (type === 'tutor') app.setCurrentTutor(entity)
		else                      app.setCurrentAdmin(entity)
	}

	return { save }
}
